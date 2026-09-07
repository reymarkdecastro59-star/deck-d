"""Unit tests for the Phase 8c LLM top-picks tier on GET /recommendations."""
import json
import time
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest

import shared.bedrock as bedrock_module
import shared.db as db_module
import shared.rawg as rawg_module
from handlers.recommendations import handler
from shared.models import Session
from tests.unit.conftest import USER_ID, FakeLambdaContext, make_event


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _seed_session(exe: str, name: str, started_at: int, duration_sec: int, sid: str) -> None:
    db_module.put_session(Session(
        user_id=USER_ID,
        session_id=sid,
        game_exe=exe,
        game_name=name,
        started_at=started_at,
        ended_at=started_at + duration_sec,
        duration_sec=duration_sec,
        label="tracked",
    ))


def _seed_metadata(ddb_table, exe: str, rawg_id: int | None, name: str,
                   genres: list[str], resolution_failed: bool = False) -> None:
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


def _seed_resolved_user(ddb_table, count: int, base_rawg_id: int = 1000) -> None:
    """Convenience: seed `count` distinct resolved-metadata games with sessions."""
    now = int(time.time())
    for i in range(count):
        exe = f"g{i}.exe"
        _seed_session(exe, f"Game {i}", now - (i + 1) * 86400, 3600, f"s{i}")
        _seed_metadata(ddb_table, exe, rawg_id=base_rawg_id + i,
                       name=f"Game {i}", genres=["Action"])


def _bedrock_response(text: str, input_tokens: int = 400, output_tokens: int = 100) -> dict:
    """Build a fake dict that mimics what shared.bedrock.invoke_haiku returns."""
    return {
        "text": text,
        "usage": {"input_tokens": input_tokens, "output_tokens": output_tokens},
    }


def _valid_llm_json(names: list[str]) -> str:
    """Serialize a valid LLM output (JSON array of name+reason pairs)."""
    return json.dumps([
        {"name": n, "reason": f"Because you'd love {n}"} for n in names
    ])


@pytest.fixture(autouse=True)
def _reset_bedrock_cache():
    """Reset the shared.bedrock module singletons between tests."""
    bedrock_module._reset_cache()
    yield
    bedrock_module._reset_cache()


@pytest.fixture
def stub_genre_rawg():
    """Stub search_games_by_genres to return None so Tier 2 is silent noise-free."""
    with patch("handlers.recommendations.search_games_by_genres", return_value=None):
        yield


# ---------------------------------------------------------------------------
# (1) threshold: below 5 resolved games → tier hidden, Bedrock NOT called
# ---------------------------------------------------------------------------

def test_threshold_below_5_returns_none(ddb_table, stub_genre_rawg):
    _seed_resolved_user(ddb_table, count=4)

    with patch("handlers.recommendations.invoke_haiku") as mock_bedrock:
        event = make_event(method="GET")
        resp = handler(event, FakeLambdaContext())

    body = json.loads(resp["body"])
    assert body["top_picks"] is None
    mock_bedrock.assert_not_called()


# ---------------------------------------------------------------------------
# (2) fresh cache: TTL in future → return without invoking Bedrock
# ---------------------------------------------------------------------------

def test_fresh_cache_returns_without_bedrock(ddb_table, stub_genre_rawg):
    _seed_resolved_user(ddb_table, count=5)
    now = int(time.time())
    cached_picks = [
        {"rawg_id": 5000, "name": "Cached A", "reason": "cached", "metacritic": 88},
        {"rawg_id": 5001, "name": "Cached B", "reason": "cached", "metacritic": 87},
    ]
    db_module.put_recs_llm(USER_ID, cached_picks, generated_at=now, ttl=now + 3600)

    with patch("handlers.recommendations.invoke_haiku") as mock_bedrock:
        event = make_event(method="GET")
        resp = handler(event, FakeLambdaContext())

    body = json.loads(resp["body"])
    assert body["top_picks"] is not None
    assert [p["name"] for p in body["top_picks"]] == ["Cached A", "Cached B"]
    mock_bedrock.assert_not_called()


# ---------------------------------------------------------------------------
# (3) stale cache + Bedrock success → new picks replace cache
# ---------------------------------------------------------------------------

def test_stale_cache_and_bedrock_success_replaces_cache(ddb_table, stub_genre_rawg):
    _seed_resolved_user(ddb_table, count=5)
    now = int(time.time())
    stale_picks = [{"rawg_id": 999, "name": "OLD", "reason": "old", "metacritic": 88}]
    db_module.put_recs_llm(USER_ID, stale_picks, generated_at=now - 90000, ttl=now - 60)

    fake_rawg = {
        "rawg_id": 6001, "name": "Fresh Pick", "slug": "fresh-pick",
        "background_image": None, "genres": ["Action"], "metacritic": 85,
        "released": "2023-01-01", "rating": Decimal("4.4"),
    }

    with patch("handlers.recommendations.invoke_haiku",
               return_value=_bedrock_response(_valid_llm_json(["Fresh Pick", "Second Pick"]))):
        with patch("handlers.recommendations.search_game_by_name", return_value=fake_rawg):
            event = make_event(method="GET")
            resp = handler(event, FakeLambdaContext())

    body = json.loads(resp["body"])
    assert body["top_picks"] is not None
    assert body["top_picks"][0]["name"] == "Fresh Pick"

    # Cache rewritten with a fresh TTL — old picks gone.
    cached = db_module.get_recs_llm(USER_ID)
    assert cached is not None
    assert int(cached["ttl"]) > now
    assert cached["picks"][0]["name"] == "Fresh Pick"


# ---------------------------------------------------------------------------
# (4) stale cache + Bedrock fails → serve stale, do NOT overwrite
# ---------------------------------------------------------------------------

def test_stale_cache_and_bedrock_fails_serves_stale(ddb_table, stub_genre_rawg):
    _seed_resolved_user(ddb_table, count=5)
    now = int(time.time())
    stale_picks = [{"rawg_id": 8888, "name": "Yesterday", "reason": "s", "metacritic": 90}]
    db_module.put_recs_llm(USER_ID, stale_picks, generated_at=now - 90000, ttl=now - 60)

    with patch(
        "handlers.recommendations.invoke_haiku",
        side_effect=bedrock_module.BedrockError("throttled"),
    ):
        event = make_event(method="GET")
        resp = handler(event, FakeLambdaContext())

    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["top_picks"] is not None
    assert body["top_picks"][0]["name"] == "Yesterday"

    # Stale cache preserved (same TTL, no rewrite).
    cached = db_module.get_recs_llm(USER_ID)
    assert int(cached["ttl"]) < now


# ---------------------------------------------------------------------------
# (5) Bedrock returns malformed JSON → return None + no cache write
# ---------------------------------------------------------------------------

def test_bedrock_bad_json_returns_none_and_no_write(ddb_table, stub_genre_rawg):
    _seed_resolved_user(ddb_table, count=5)

    with patch("handlers.recommendations.invoke_haiku",
               return_value=_bedrock_response("this is not json at all")):
        event = make_event(method="GET")
        resp = handler(event, FakeLambdaContext())

    body = json.loads(resp["body"])
    assert body["top_picks"] is None
    assert db_module.get_recs_llm(USER_ID) is None


# ---------------------------------------------------------------------------
# (6) both suggestions rejected → fall through to genre-based promotion
# ---------------------------------------------------------------------------

def test_both_suggestions_rejected_falls_through_to_genre_based(ddb_table):
    _seed_resolved_user(ddb_table, count=5)
    now = int(time.time())

    # Seed a live genre-based cache so Tier 2 returns a non-empty list.
    genre_cached = [
        {"rawg_id": 3001, "name": "Genre A", "slug": "genre-a",
         "background_image": None, "genres": ["Action"], "metacritic": 88,
         "rating": Decimal("4.3")},
        {"rawg_id": 3002, "name": "Genre B", "slug": "genre-b",
         "background_image": None, "genres": ["Action"], "metacritic": 87,
         "rating": Decimal("4.2")},
        {"rawg_id": 3003, "name": "Genre C", "slug": "genre-c",
         "background_image": None, "genres": ["Action"], "metacritic": 85,
         "rating": Decimal("4.1")},
    ]
    db_module.put_recs_genre(USER_ID, genre_cached, ttl=now + 3600)

    with patch("handlers.recommendations.invoke_haiku",
               return_value=_bedrock_response(_valid_llm_json(["Bad1", "Bad2"]))):
        # RAWG rejects both LLM suggestions (returns None).
        with patch("handlers.recommendations.search_game_by_name", return_value=None):
            event = make_event(method="GET")
            resp = handler(event, FakeLambdaContext())

    body = json.loads(resp["body"])
    assert body["top_picks"] is not None
    assert len(body["top_picks"]) == 2
    assert {p["name"] for p in body["top_picks"]} == {"Genre A", "Genre B"}
    assert body["top_picks"][0]["reason"] == "Well-reviewed in genres you play often"


# ---------------------------------------------------------------------------
# (7) both rejected + no genre fallback → tier hides
# ---------------------------------------------------------------------------

def test_both_rejected_no_genre_hides_tier(ddb_table, stub_genre_rawg):
    _seed_resolved_user(ddb_table, count=5)

    with patch("handlers.recommendations.invoke_haiku",
               return_value=_bedrock_response(_valid_llm_json(["X", "Y"]))):
        with patch("handlers.recommendations.search_game_by_name", return_value=None):
            event = make_event(method="GET")
            resp = handler(event, FakeLambdaContext())

    body = json.loads(resp["body"])
    assert body["top_picks"] is None
    # Genre tier stubbed to None as well.
    assert body["genre_based"] is None


# ---------------------------------------------------------------------------
# (8) prompt excludes resolution_failed sessions
# ---------------------------------------------------------------------------

def test_prompt_excludes_resolution_failed_games(ddb_table, stub_genre_rawg):
    now = int(time.time())
    # 5 resolved games so we cross the LLM threshold, PLUS one unresolved.
    for i in range(5):
        _seed_session(f"ok{i}.exe", f"OK {i}", now - (i + 1) * 86400, 3600, f"ok{i}")
        _seed_metadata(ddb_table, f"ok{i}.exe", rawg_id=7000 + i, name=f"OK {i}",
                       genres=["Action"])
    # The one whose metadata is unresolved — must NOT appear in the prompt.
    _seed_session("mystery.exe", "Mystery.exe", now - 3600, 7200, "mys1")
    _seed_metadata(ddb_table, "mystery.exe", rawg_id=None, name="mystery.exe",
                   genres=[], resolution_failed=True)

    captured = {}

    def _capture_invoke(context, system, user, max_tokens=400):
        captured["user"] = user
        return _bedrock_response(_valid_llm_json(["Fresh", "Also Fresh"]))

    fake_rawg = {
        "rawg_id": 6100, "name": "Fresh", "slug": "fresh",
        "background_image": None, "genres": ["Action"], "metacritic": 85,
    }
    with patch("handlers.recommendations.invoke_haiku", side_effect=_capture_invoke):
        with patch("handlers.recommendations.search_game_by_name", return_value=fake_rawg):
            handler(make_event(method="GET"), FakeLambdaContext())

    assert "user" in captured
    assert "mystery.exe" not in captured["user"].lower()
    assert "OK 0" in captured["user"]  # resolved names DO appear


# ---------------------------------------------------------------------------
# (9) suggestion whose rawg_id is already played → rejected
# ---------------------------------------------------------------------------

def test_prompt_excludes_played_games_from_output(ddb_table, stub_genre_rawg):
    _seed_resolved_user(ddb_table, count=5, base_rawg_id=200)

    # RAWG hit whose id matches one the user already played (base 200 → 200..204).
    played_hit = {
        "rawg_id": 202, "name": "Already Owned", "slug": "already-owned",
        "background_image": None, "genres": ["Action"], "metacritic": 90,
    }
    good_hit = {
        "rawg_id": 9500, "name": "New Discovery", "slug": "new-discovery",
        "background_image": None, "genres": ["Action"], "metacritic": 85,
    }
    call_order = [played_hit, good_hit]

    def _rawg_side_effect(name, retries=2, backoff_sec=0.25):
        return call_order.pop(0)

    with patch("handlers.recommendations.invoke_haiku",
               return_value=_bedrock_response(_valid_llm_json(["Already Owned", "New Discovery"]))):
        with patch("handlers.recommendations.search_game_by_name",
                   side_effect=_rawg_side_effect):
            event = make_event(method="GET")
            resp = handler(event, FakeLambdaContext())

    body = json.loads(resp["body"])
    assert body["top_picks"] is not None
    names = [p["name"] for p in body["top_picks"]]
    assert "Already Owned" not in names
    assert "New Discovery" in names


# ---------------------------------------------------------------------------
# (10) inference profile ARN constructed from context.invoked_function_arn
# ---------------------------------------------------------------------------

def test_inference_profile_arn_constructed_from_context():
    class _Ctx:
        invoked_function_arn = "arn:aws:lambda:ap-southeast-2:123456789012:function:deckd-recommendations-dev"

    bedrock_module._reset_cache()
    arn = bedrock_module.get_inference_profile_arn(_Ctx())

    assert arn == (
        "arn:aws:bedrock:ap-southeast-2:123456789012:inference-profile/"
        "apac.anthropic.claude-haiku-4-5-v1:0"
    )

    # Cached — a second call must not rebuild (return the same instance).
    arn2 = bedrock_module.get_inference_profile_arn(_Ctx())
    assert arn2 is arn
