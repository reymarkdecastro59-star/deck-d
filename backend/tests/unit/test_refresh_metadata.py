"""Unit tests for handlers.refresh_metadata cron handler."""
import time
from decimal import Decimal
from unittest.mock import patch, MagicMock

import pytest

import shared.db as db_module
import handlers.refresh_metadata as refresh_module
from shared.models import Session


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _session(exe: str, started_at: int, session_id: str) -> Session:
    return Session(
        user_id="u1",
        session_id=session_id,
        game_exe=exe,
        game_name="Test Game",
        started_at=started_at,
        ended_at=started_at + 3600,
        duration_sec=3600,
    )


def _meta(exe: str, fetched_at: int, resolution_failed: bool = False) -> dict:
    return {
        "pk": f"GAME#{exe}",
        "sk": "METADATA",
        "gsi2pk": "GAME",
        "gsi2sk": f"{fetched_at:020d}",
        "game_exe": exe,
        "rawg_id": None if resolution_failed else 1,
        "name": None if resolution_failed else "Game Name",
        "slug": None if resolution_failed else "game-name",
        "genres": [],
        "tags": [],
        "metacritic": None,
        "released": None,
        "background_image": None,
        "rating": None,
        "fetched_at": fetched_at,
        "resolution_failed": resolution_failed,
    }


def _good_rawg_result(exe: str) -> dict:
    now = int(time.time())
    return {
        "pk": f"GAME#{exe}",
        "sk": "METADATA",
        "gsi2pk": "GAME",
        "gsi2sk": f"{now:020d}",
        "game_exe": exe,
        "rawg_id": 42,
        "name": "Found Game",
        "slug": "found-game",
        "genres": ["Action"],
        "tags": [],
        "metacritic": 85,
        "released": "2021-01-01",
        "background_image": None,
        "rating": Decimal("4.2"),
        "fetched_at": now,
        "resolution_failed": False,
    }


def _failed_rawg_result(exe: str) -> dict:
    now = int(time.time())
    return {
        "pk": f"GAME#{exe}",
        "sk": "METADATA",
        "gsi2pk": "GAME",
        "gsi2sk": f"{now:020d}",
        "game_exe": exe,
        "rawg_id": None,
        "name": None,
        "slug": None,
        "genres": [],
        "tags": [],
        "metacritic": None,
        "released": None,
        "background_image": None,
        "rating": None,
        "fetched_at": now,
        "resolution_failed": True,
    }


# ---------------------------------------------------------------------------
# (a) discovers a new exe from sessions and writes cache
# ---------------------------------------------------------------------------

def test_discovers_new_exe_from_sessions(ddb_table, monkeypatch):
    now = int(time.time())
    db_module.put_session(_session("newgame.exe", now - 100, "s1"))

    mock_fetch = MagicMock(side_effect=lambda exe: _good_rawg_result(exe))
    monkeypatch.setattr(refresh_module, "fetch_metadata", mock_fetch)

    result = refresh_module.handler({}, None)

    assert result["new"] >= 1
    assert result["processed"] >= 1
    item = db_module.get_game_metadata("newgame.exe")
    assert item is not None
    assert item["rawg_id"] == 42


# ---------------------------------------------------------------------------
# (b) refreshes stale items
# ---------------------------------------------------------------------------

def test_refreshes_stale_items(ddb_table, monkeypatch):
    now = int(time.time())
    stale_fetched = now - 10 * 86_400  # 10 days ago; default stale_days=7
    db_module.put_game_metadata(_meta("stale.exe", stale_fetched))

    mock_fetch = MagicMock(side_effect=lambda exe: _good_rawg_result(exe))
    monkeypatch.setattr(refresh_module, "fetch_metadata", mock_fetch)
    monkeypatch.setenv("REFRESH_STALE_DAYS", "7")

    result = refresh_module.handler({}, None)

    assert result["refreshed"] >= 1
    mock_fetch.assert_called()


# ---------------------------------------------------------------------------
# (c) skips fresh items
# ---------------------------------------------------------------------------

def test_skips_fresh_items(ddb_table, monkeypatch):
    now = int(time.time())
    fresh_fetched = now - 1 * 86_400  # 1 day ago, well within 7-day window
    db_module.put_game_metadata(_meta("fresh.exe", fresh_fetched))

    mock_fetch = MagicMock(side_effect=lambda exe: _good_rawg_result(exe))
    monkeypatch.setattr(refresh_module, "fetch_metadata", mock_fetch)
    monkeypatch.setenv("REFRESH_STALE_DAYS", "7")

    result = refresh_module.handler({}, None)

    mock_fetch.assert_not_called()
    assert result["processed"] == 0


# ---------------------------------------------------------------------------
# (d) respects MAX_CALLS_PER_RUN
# ---------------------------------------------------------------------------

def test_respects_max_calls_per_run(ddb_table, monkeypatch):
    now = int(time.time())
    for i in range(10):
        db_module.put_session(_session(f"exe{i}.exe", now - 100, f"s{i}"))

    mock_fetch = MagicMock(side_effect=lambda exe: _good_rawg_result(exe))
    monkeypatch.setattr(refresh_module, "fetch_metadata", mock_fetch)
    monkeypatch.setenv("MAX_CALLS_PER_RUN", "3")

    result = refresh_module.handler({}, None)

    assert result["processed"] == 3
    assert mock_fetch.call_count == 3


# ---------------------------------------------------------------------------
# (e) records resolution_failed=True when RAWG returns nothing
# ---------------------------------------------------------------------------

def test_records_resolution_failed(ddb_table, monkeypatch):
    now = int(time.time())
    db_module.put_session(_session("mystery.exe", now - 100, "s1"))

    mock_fetch = MagicMock(return_value=_failed_rawg_result("mystery.exe"))
    monkeypatch.setattr(refresh_module, "fetch_metadata", mock_fetch)

    result = refresh_module.handler({}, None)

    assert result["failed"] >= 1
    item = db_module.get_game_metadata("mystery.exe")
    assert item is not None
    assert item["resolution_failed"] is True
    assert item["rawg_id"] is None


# ---------------------------------------------------------------------------
# (f) failed items with recent fetched_at are NOT retried
# ---------------------------------------------------------------------------

def test_failed_item_not_retried_if_recent(ddb_table, monkeypatch):
    now = int(time.time())
    recent_fail = now - 5 * 86_400  # 5 days ago, failed_retry_days=30 → not due
    db_module.put_game_metadata(_meta("failing.exe", recent_fail, resolution_failed=True))

    mock_fetch = MagicMock(side_effect=lambda exe: _good_rawg_result(exe))
    monkeypatch.setattr(refresh_module, "fetch_metadata", mock_fetch)
    monkeypatch.setenv("FAILED_RETRY_DAYS", "30")

    result = refresh_module.handler({}, None)

    mock_fetch.assert_not_called()
    assert result["processed"] == 0
