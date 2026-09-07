"""Unit tests for handlers.recommendations — GET /recommendations (Tiers 1 & 2)."""
import json
import time
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest

import shared.db as db_module
import shared.rawg as rawg_module
from handlers.recommendations import handler
from shared.models import Session
from tests.unit.conftest import USER_ID, FakeLambdaContext, make_event


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _seed_trending(ddb_table, games: list) -> None:
    """Write a TRENDING#DAILY item directly into the mocked table."""
    ddb_table.put_item(
        Item={
            "pk": "TRENDING#DAILY",
            "sk": "METADATA",
            "games": games,
            "updated_at": "2026-09-06T03:00:00Z",
            "ttl": 9_999_999_999,
        }
    )


def _seed_session(game_exe: str, game_name: str, started_at: int, duration_sec: int, sid: str) -> None:
    db_module.put_session(Session(
        user_id=USER_ID,
        session_id=sid,
        game_exe=game_exe,
        game_name=game_name,
        started_at=started_at,
        ended_at=started_at + duration_sec,
        duration_sec=duration_sec,
        label="tracked",
    ))


def _seed_metadata(ddb_table, exe: str, rawg_id: int | None, name: str, genres: list[str],
                   resolution_failed: bool = False) -> None:
    """Write a GAME#{exe} metadata item with the fields the tier reads."""
    ddb_table.put_item(Item={
        "pk": f"GAME#{exe}",
        "sk": "METADATA",
        "gsi2pk": "GAME",
        "gsi2sk": f"{int(time.time()):020d}",
        "game_exe": exe,
        "rawg_id": rawg_id,
        "name": name,
        "slug": name.lower().replace(" ", "-"),
        "genres": genres,
        "tags": [],
        "metacritic": 90,
        "released": "2022-01-01",
        "background_image": None,
        "rating": Decimal("4.5"),
        "fetched_at": int(time.time()),
        "resolution_failed": resolution_failed,
    })


def _rawg_candidates_payload(games: list[dict]) -> dict:
    """Shape a RAWG /games response with the fields search_games_by_genres reads."""
    return {"count": len(games), "results": games}


def _rawg_game(rawg_id: int, name: str, genres: list[str] = None,
               rating: float = 4.2, metacritic: int = 85) -> dict:
    return {
        "id": rawg_id,
        "name": name,
        "slug": name.lower().replace(" ", "-"),
        "background_image": f"https://example.com/{rawg_id}.jpg",
        "genres": [{"name": g} for g in (genres or ["Action"])],
        "metacritic": metacritic,
        "released": "2023-05-01",
        "rating": rating,
    }


_SAMPLE_GAMES = [
    {
        "rawg_id": 1,
        "name": "Elden Ring",
        "slug": "elden-ring",
        "background_image": "https://example.com/er.jpg",
        "genres": ["Action", "RPG"],
        "metacritic": 96,
        "released": "2022-02-25",
        "rating": Decimal("4.5"),
    },
    {
        "rawg_id": 2,
        "name": "Hades",
        "slug": "hades",
        "background_image": "https://example.com/hades.jpg",
        "genres": ["Action", "Indie"],
        "metacritic": 93,
        "released": "2020-09-17",
        "rating": Decimal("4.4"),
    },
]


# ---------------------------------------------------------------------------
# (a) Returns trending games when the DynamoDB item is present
# ---------------------------------------------------------------------------

def test_returns_trending_when_item_present(ddb_table):
    _seed_trending(ddb_table, _SAMPLE_GAMES)
    event = make_event(method="GET")
    resp = handler(event, FakeLambdaContext())

    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert len(body["trending"]) == 2
    first = body["trending"][0]
    assert first["name"] == "Elden Ring"
    assert first["slug"] == "elden-ring"
    assert first["metacritic"] == 96
    assert first["genres"] == ["Action", "RPG"]
    assert abs(first["rating"] - 4.5) < 0.001


# ---------------------------------------------------------------------------
# (b) Returns empty array (not 500) when trending item is missing
# ---------------------------------------------------------------------------

def test_returns_empty_array_when_item_missing(ddb_table):
    event = make_event(method="GET")
    resp = handler(event, FakeLambdaContext())

    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["trending"] == []


# ---------------------------------------------------------------------------
# (c) Response envelope always has all three tier keys
# ---------------------------------------------------------------------------

def test_envelope_has_all_three_tier_keys(ddb_table):
    event = make_event(method="GET")
    resp = handler(event, FakeLambdaContext())

    body = json.loads(resp["body"])
    assert "trending" in body
    assert "genre_based" in body
    assert "top_picks" in body


# ---------------------------------------------------------------------------
# (d) top_picks still null in Phase 8b; genre_based null for empty user
# ---------------------------------------------------------------------------

def test_top_picks_still_null_and_genre_null_for_new_user(ddb_table):
    _seed_trending(ddb_table, _SAMPLE_GAMES)
    event = make_event(method="GET")
    resp = handler(event, FakeLambdaContext())

    body = json.loads(resp["body"])
    # Phase 8c not implemented yet.
    assert body["top_picks"] is None
    # User has no sessions → below-threshold → tier hidden.
    assert body["genre_based"] is None


# ---------------------------------------------------------------------------
# (e) Cache-Control header is set for 5 minutes (private)
# ---------------------------------------------------------------------------

def test_cache_control_header(ddb_table):
    event = make_event(method="GET")
    resp = handler(event, FakeLambdaContext())

    assert resp["statusCode"] == 200
    assert resp["headers"]["Cache-Control"] == "private, max-age=300"


# ---------------------------------------------------------------------------
# (f) Cognito auth is enforced — missing claims returns 500 (not 200)
# ---------------------------------------------------------------------------

def test_missing_cognito_claims_raises(ddb_table):
    bad_event = {
        "httpMethod": "GET",
        "requestContext": {},
        "body": None,
        "headers": {},
        "queryStringParameters": None,
        "pathParameters": None,
    }
    resp = handler(bad_event, FakeLambdaContext())
    assert resp["statusCode"] == 500


# ---------------------------------------------------------------------------
# Phase 8b — genre-based tier
# ---------------------------------------------------------------------------

def test_genre_below_threshold_returns_null(ddb_table):
    """User with fewer than 3 resolved games gets no genre tier."""
    now = int(time.time())
    _seed_session("game1.exe", "Game 1", now - 86400, 3600, "s1")
    _seed_session("game2.exe", "Game 2", now - 172800, 3600, "s2")
    _seed_metadata(ddb_table, "game1.exe", rawg_id=101, name="Game 1", genres=["Action"])
    _seed_metadata(ddb_table, "game2.exe", rawg_id=102, name="Game 2", genres=["RPG"])

    event = make_event(method="GET")
    resp = handler(event, FakeLambdaContext())

    body = json.loads(resp["body"])
    # Only 2 resolved games — under the threshold of 3.
    assert body["genre_based"] is None


def test_genre_uses_cache_when_present_and_skips_rawg(ddb_table):
    """A fresh cache short-circuits the compute path — no RAWG call is made."""
    cached_games = [
        {"rawg_id": 500, "name": "Cached Rec", "slug": "cached-rec",
         "genres": ["Action"], "metacritic": 88, "rating": Decimal("4.3")},
    ]
    ddb_table.put_item(Item={
        "pk": f"USER#{USER_ID}",
        "sk": "RECS#GENRE",
        "games": cached_games,
        "ttl": int(time.time()) + 3600,
    })

    with patch.object(rawg_module.requests, "get") as mock_get:
        event = make_event(method="GET")
        resp = handler(event, FakeLambdaContext())

    body = json.loads(resp["body"])
    assert body["genre_based"] is not None
    assert len(body["genre_based"]) == 1
    assert body["genre_based"][0]["name"] == "Cached Rec"
    # No RAWG traffic on cache hit — that's the whole point of the cache.
    mock_get.assert_not_called()


def test_genre_cache_expired_recomputes(ddb_table):
    """An expired cache (ttl in the past) is ignored — the compute path runs."""
    now = int(time.time())
    # Stale cache from a day+ ago.
    ddb_table.put_item(Item={
        "pk": f"USER#{USER_ID}",
        "sk": "RECS#GENRE",
        "games": [{"name": "STALE", "slug": "stale", "rawg_id": 999}],
        "ttl": now - 60,
    })
    # Seed enough sessions + metadata to cross the threshold.
    for i in range(3):
        _seed_session(f"g{i}.exe", f"G{i}", now - (i + 1) * 86400, 3600, f"s{i}")
        _seed_metadata(ddb_table, f"g{i}.exe", rawg_id=200 + i, name=f"G{i}",
                       genres=["Action"])

    fresh_payload = _rawg_candidates_payload([_rawg_game(600, "Fresh Pick")])
    mock_resp = MagicMock(ok=True)
    mock_resp.json.return_value = fresh_payload

    with patch.object(rawg_module.requests, "get", return_value=mock_resp):
        event = make_event(method="GET")
        resp = handler(event, FakeLambdaContext())

    body = json.loads(resp["body"])
    assert body["genre_based"] is not None
    names = [g["name"] for g in body["genre_based"]]
    assert "Fresh Pick" in names
    assert "STALE" not in names


def test_genre_computes_and_caches_on_miss(ddb_table):
    """First call fetches from RAWG and writes the cache."""
    now = int(time.time())
    for i in range(3):
        _seed_session(f"a{i}.exe", f"A{i}", now - (i + 1) * 86400, 3600, f"s{i}")
        _seed_metadata(ddb_table, f"a{i}.exe", rawg_id=300 + i, name=f"A{i}",
                       genres=["Action"])

    payload = _rawg_candidates_payload([
        _rawg_game(700, "Rec One", genres=["Action"]),
        _rawg_game(701, "Rec Two", genres=["Action"]),
    ])
    mock_resp = MagicMock(ok=True)
    mock_resp.json.return_value = payload

    with patch.object(rawg_module.requests, "get", return_value=mock_resp) as mock_get:
        event = make_event(method="GET")
        resp = handler(event, FakeLambdaContext())

    body = json.loads(resp["body"])
    assert body["genre_based"] is not None
    assert len(body["genre_based"]) == 2
    assert {g["name"] for g in body["genre_based"]} == {"Rec One", "Rec Two"}
    # One RAWG call — the tier issues a single genre-batched query.
    assert mock_get.call_count == 1

    # Cache written for next call.
    cached = db_module.get_recs_genre(USER_ID)
    assert cached is not None
    assert len(cached["games"]) == 2


def test_genre_excludes_played_games(ddb_table):
    """RAWG candidate whose rawg_id is in the user's history is dropped."""
    now = int(time.time())
    played_rawg_id = 300
    for i in range(3):
        _seed_session(f"p{i}.exe", f"P{i}", now - (i + 1) * 86400, 3600, f"s{i}")
        _seed_metadata(ddb_table, f"p{i}.exe", rawg_id=played_rawg_id + i, name=f"P{i}",
                       genres=["Action"])

    payload = _rawg_candidates_payload([
        _rawg_game(played_rawg_id, "Already Played", genres=["Action"]),  # excluded
        _rawg_game(9001, "New Rec", genres=["Action"]),  # kept
    ])
    mock_resp = MagicMock(ok=True)
    mock_resp.json.return_value = payload

    with patch.object(rawg_module.requests, "get", return_value=mock_resp):
        event = make_event(method="GET")
        resp = handler(event, FakeLambdaContext())

    body = json.loads(resp["body"])
    names = [g["name"] for g in body["genre_based"]]
    assert "Already Played" not in names
    assert "New Rec" in names


def test_genre_ranks_by_decay_weighted_genres(ddb_table):
    """The RAWG call must target the most-decayed genres, not alphabetical order."""
    now = int(time.time())
    # 3 games: dominant genre is RPG (2 sessions, one very recent),
    # then Action (1 old session), then Strategy (1 old session).
    _seed_session("rpg1.exe", "RPG1", now - 3600, 7200, "s1")     # 1h ago, big weight
    _seed_session("rpg2.exe", "RPG2", now - 86400, 3600, "s2")    # 1 day ago
    _seed_session("act.exe",  "ACT",  now - 20 * 86400, 3600, "s3")  # ~1.4 half-lives ago
    _seed_session("str.exe",  "STR",  now - 25 * 86400, 3600, "s4")  # older still

    _seed_metadata(ddb_table, "rpg1.exe", rawg_id=1, name="RPG1", genres=["RPG"])
    _seed_metadata(ddb_table, "rpg2.exe", rawg_id=2, name="RPG2", genres=["RPG"])
    _seed_metadata(ddb_table, "act.exe",  rawg_id=3, name="ACT",  genres=["Action"])
    _seed_metadata(ddb_table, "str.exe",  rawg_id=4, name="STR",  genres=["Strategy"])

    payload = _rawg_candidates_payload([_rawg_game(9999, "Result")])
    mock_resp = MagicMock(ok=True)
    mock_resp.json.return_value = payload

    with patch.object(rawg_module.requests, "get", return_value=mock_resp) as mock_get:
        event = make_event(method="GET")
        handler(event, FakeLambdaContext())

    # Inspect the params of the RAWG call — RPG slug must be first (highest weight).
    call_kwargs = mock_get.call_args.kwargs
    genres_param = call_kwargs["params"]["genres"]
    slugs = genres_param.split(",")
    assert slugs[0] == "role-playing-games-rpg"


def test_genre_rawg_failure_returns_null_not_500(ddb_table):
    """A RAWG outage must degrade to genre_based=None, never surface as a 500."""
    now = int(time.time())
    for i in range(3):
        _seed_session(f"x{i}.exe", f"X{i}", now - (i + 1) * 86400, 3600, f"s{i}")
        _seed_metadata(ddb_table, f"x{i}.exe", rawg_id=400 + i, name=f"X{i}",
                       genres=["Action"])

    mock_resp = MagicMock(ok=False, status_code=503)
    with patch.object(rawg_module.requests, "get", return_value=mock_resp):
        event = make_event(method="GET")
        resp = handler(event, FakeLambdaContext())

    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["genre_based"] is None
    # And nothing gets cached — next request will retry.
    assert db_module.get_recs_genre(USER_ID) is None


def test_genre_unresolved_metadata_does_not_count_toward_threshold(ddb_table):
    """resolution_failed items don't count — user with 3 unresolved is still below."""
    now = int(time.time())
    for i in range(3):
        _seed_session(f"u{i}.exe", f"U{i}", now - (i + 1) * 86400, 3600, f"s{i}")
        _seed_metadata(ddb_table, f"u{i}.exe", rawg_id=None, name=f"U{i}",
                       genres=[], resolution_failed=True)

    event = make_event(method="GET")
    resp = handler(event, FakeLambdaContext())

    body = json.loads(resp["body"])
    assert body["genre_based"] is None
