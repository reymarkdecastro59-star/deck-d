"""Unit tests for the trending-fetch extension on handlers.refresh_metadata."""
import time
from unittest.mock import patch, MagicMock

import pytest

import shared.db as db_module
import handlers.refresh_metadata as refresh_module


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _rawg_trending_payload(count: int = 5) -> dict:
    """Build a fake RAWG /games response for trending."""
    results = []
    for i in range(count):
        results.append({
            "id": 100 + i,
            "name": f"Trending Game {i}",
            "slug": f"trending-game-{i}",
            "background_image": f"https://example.com/game{i}.jpg",
            "genres": [{"name": "Action"}],
            "metacritic": 80 + i,
            "released": "2026-01-01",
            "rating": 4.0,
        })
    return {"count": count, "results": results}


def _rawg_trending_with_blanks(count: int = 5) -> dict:
    """Some results are missing slug/name — should be filtered out."""
    results = []
    for i in range(count):
        results.append({
            "id": 200 + i,
            "name": f"Game {i}" if i % 2 == 0 else "",  # odd entries have blank name
            "slug": f"game-{i}" if i % 2 == 0 else "",
            "background_image": None,
            "genres": [],
            "metacritic": 80,
            "released": "2026-01-01",
            "rating": 4.0,
        })
    return {"count": count, "results": results}


# ---------------------------------------------------------------------------
# (a) Writes correct DynamoDB shape when RAWG succeeds
# ---------------------------------------------------------------------------

def test_writes_trending_item_on_success(ddb_table, monkeypatch):
    """When RAWG returns valid results, put_trending_daily writes the item."""
    mock_resp = MagicMock()
    mock_resp.ok = True
    mock_resp.json.return_value = _rawg_trending_payload(count=5)

    # Patch the requests.get inside the refresh_metadata module.
    with patch.object(refresh_module.requests, "get", return_value=mock_resp) as mock_get:
        # Also stub fetch_metadata so the main metadata loop doesn't call RAWG.
        monkeypatch.setattr(refresh_module, "fetch_metadata", MagicMock(return_value={
            "game_exe": "dummy.exe", "resolution_failed": False,
        }))

        refresh_module.handler({}, None)

    item = db_module.get_trending_daily()
    assert item is not None
    assert "games" in item
    assert len(item["games"]) == 5
    assert item["games"][0]["slug"] == "trending-game-0"
    assert "updated_at" in item
    assert "ttl" in item


# ---------------------------------------------------------------------------
# (b) Does NOT overwrite existing item when RAWG returns non-200
# ---------------------------------------------------------------------------

def test_does_not_overwrite_on_rawg_failure(ddb_table, monkeypatch):
    """Existing trending item must survive a RAWG failure."""
    # Seed an existing item.
    stale_games = [{"rawg_id": 999, "name": "Stale Game", "slug": "stale-game"}]
    db_module.put_trending_daily(
        games=stale_games,
        updated_at="2026-09-05T03:00:00Z",
        ttl=int(time.time()) + 3600,
    )

    mock_resp = MagicMock()
    mock_resp.ok = False
    mock_resp.status_code = 503
    mock_resp.text = "Service Unavailable"

    with patch.object(refresh_module.requests, "get", return_value=mock_resp):
        monkeypatch.setattr(refresh_module, "fetch_metadata", MagicMock(return_value={
            "game_exe": "dummy.exe", "resolution_failed": False,
        }))
        refresh_module.handler({}, None)

    item = db_module.get_trending_daily()
    assert item is not None
    assert item["games"] == stale_games  # unchanged


# ---------------------------------------------------------------------------
# (c) Does NOT overwrite when requests raises a network exception
# ---------------------------------------------------------------------------

def test_does_not_overwrite_on_network_error(ddb_table, monkeypatch):
    """A RequestException must not corrupt the existing trending item."""
    import requests as req_lib

    stale_games = [{"rawg_id": 888, "name": "Still Here", "slug": "still-here"}]
    db_module.put_trending_daily(
        games=stale_games,
        updated_at="2026-09-05T03:00:00Z",
        ttl=int(time.time()) + 3600,
    )

    with patch.object(
        refresh_module.requests,
        "get",
        side_effect=req_lib.RequestException("timeout"),
    ):
        monkeypatch.setattr(refresh_module, "fetch_metadata", MagicMock(return_value={
            "game_exe": "dummy.exe", "resolution_failed": False,
        }))
        refresh_module.handler({}, None)

    item = db_module.get_trending_daily()
    assert item["games"] == stale_games


# ---------------------------------------------------------------------------
# (d) TTL is set roughly 26 hours in the future
# ---------------------------------------------------------------------------

def test_ttl_is_26h_from_write(ddb_table, monkeypatch):
    mock_resp = MagicMock()
    mock_resp.ok = True
    mock_resp.json.return_value = _rawg_trending_payload(count=3)

    before = int(time.time())
    with patch.object(refresh_module.requests, "get", return_value=mock_resp):
        monkeypatch.setattr(refresh_module, "fetch_metadata", MagicMock(return_value={
            "game_exe": "dummy.exe", "resolution_failed": False,
        }))
        refresh_module.handler({}, None)
    after = int(time.time())

    item = db_module.get_trending_daily()
    ttl = int(item["ttl"])
    expected_low = before + 26 * 3600
    expected_high = after + 26 * 3600

    assert expected_low <= ttl <= expected_high, (
        f"TTL {ttl} not in [{expected_low}, {expected_high}]"
    )


# ---------------------------------------------------------------------------
# (e) Results without slug or name are filtered out
# ---------------------------------------------------------------------------

def test_filters_results_missing_slug_or_name(ddb_table, monkeypatch):
    """Games with blank slug or blank name must be excluded from the stored list."""
    mock_resp = MagicMock()
    mock_resp.ok = True
    mock_resp.json.return_value = _rawg_trending_with_blanks(count=6)

    with patch.object(refresh_module.requests, "get", return_value=mock_resp):
        monkeypatch.setattr(refresh_module, "fetch_metadata", MagicMock(return_value={
            "game_exe": "dummy.exe", "resolution_failed": False,
        }))
        refresh_module.handler({}, None)

    item = db_module.get_trending_daily()
    # 6 results, half have blank slug/name → only 3 stored
    assert len(item["games"]) == 3
    for g in item["games"]:
        assert g["slug"]
        assert g["name"]


# ---------------------------------------------------------------------------
# (f) Trending failure is non-fatal — rest of cron result still returned
# ---------------------------------------------------------------------------

def test_trending_failure_does_not_abort_cron(ddb_table, monkeypatch):
    """Even when _refresh_trending fails, handler() returns the normal result dict."""
    mock_resp = MagicMock()
    mock_resp.ok = False
    mock_resp.status_code = 500
    mock_resp.text = "error"

    with patch.object(refresh_module.requests, "get", return_value=mock_resp):
        monkeypatch.setattr(refresh_module, "fetch_metadata", MagicMock(return_value={
            "game_exe": "dummy.exe", "resolution_failed": False,
        }))
        result = refresh_module.handler({}, None)

    # handler still returns its standard dict
    assert "processed" in result
    assert "new" in result
    assert "refreshed" in result
    assert "failed" in result
