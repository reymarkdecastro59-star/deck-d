"""Unit tests for handlers.recommendations — GET /recommendations (Tier 1 only)."""
import json
from decimal import Decimal
import pytest

import shared.db as db_module
from handlers.recommendations import handler
from tests.unit.conftest import make_event, FakeLambdaContext


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
    # Spot-check key fields survive the DDB → JSON round-trip.
    first = body["trending"][0]
    assert first["name"] == "Elden Ring"
    assert first["slug"] == "elden-ring"
    assert first["metacritic"] == 96
    assert first["genres"] == ["Action", "RPG"]
    # Decimal("4.5") is serialised to float 4.5 by _DecimalEncoder.
    assert abs(first["rating"] - 4.5) < 0.001


# ---------------------------------------------------------------------------
# (b) Returns empty array (not 500) when trending item is missing
# ---------------------------------------------------------------------------

def test_returns_empty_array_when_item_missing(ddb_table):
    # No seed — item doesn't exist yet (cron hasn't run).
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
# (d) genre_based and top_picks are explicitly null in Phase 8a
# ---------------------------------------------------------------------------

def test_genre_based_and_top_picks_are_null(ddb_table):
    _seed_trending(ddb_table, _SAMPLE_GAMES)
    event = make_event(method="GET")
    resp = handler(event, FakeLambdaContext())

    body = json.loads(resp["body"])
    assert body["genre_based"] is None
    assert body["top_picks"] is None


# ---------------------------------------------------------------------------
# (e) Cache-Control header is set for 5 minutes (private)
# ---------------------------------------------------------------------------

def test_cache_control_header(ddb_table):
    event = make_event(method="GET")
    resp = handler(event, FakeLambdaContext())

    assert resp["statusCode"] == 200
    assert resp["headers"]["Cache-Control"] == "private, max-age=300"


# ---------------------------------------------------------------------------
# (f) Cognito auth is enforced — missing claims raises KeyError (not 200)
# ---------------------------------------------------------------------------

def test_missing_cognito_claims_raises(ddb_table):
    """
    The handler calls get_user_id(), which reads
    event["requestContext"]["authorizer"]["claims"]["sub"].
    A request without that key must NOT return 200 — it should
    either bubble a KeyError (caught by the top-level except → 500)
    or raise before hitting the DB path.
    """
    bad_event = {
        "httpMethod": "GET",
        "requestContext": {},  # no authorizer → KeyError in get_user_id
        "body": None,
        "headers": {},
        "queryStringParameters": None,
        "pathParameters": None,
    }
    resp = handler(bad_event, FakeLambdaContext())
    # The outer try/except returns 500 — not 200
    assert resp["statusCode"] == 500
