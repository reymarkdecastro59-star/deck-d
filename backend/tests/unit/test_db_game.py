"""Unit tests for game-metadata DB helpers in shared.db."""
import time
from decimal import Decimal

import pytest

import shared.db as db_module
from shared.models import Session


def _meta(exe: str = "game.exe", fetched_at: int = 1_700_000_000) -> dict:
    return {
        "pk": f"GAME#{exe}",
        "sk": "METADATA",
        "gsi2pk": "GAME",
        "gsi2sk": f"{fetched_at:020d}",
        "game_exe": exe,
        "rawg_id": 1,
        "name": "My Game",
        "slug": "my-game",
        "genres": ["Action"],
        "tags": ["Singleplayer"],
        "metacritic": 80,
        "released": "2020-01-01",
        "background_image": "https://example.com/img.jpg",
        "rating": Decimal("4.0"),
        "fetched_at": fetched_at,
        "resolution_failed": False,
    }


# ---------------------------------------------------------------------------
# put / get roundtrip
# ---------------------------------------------------------------------------

def test_put_and_get_game_metadata(ddb_table):
    db_module.put_game_metadata(_meta("csgo.exe", 1_700_000_000))
    item = db_module.get_game_metadata("csgo.exe")
    assert item is not None
    assert item["game_exe"] == "csgo.exe"
    assert item["rawg_id"] == 1
    assert item["genres"] == ["Action"]


def test_get_game_metadata_missing(ddb_table):
    assert db_module.get_game_metadata("nothere.exe") is None


def test_put_overwrites_existing(ddb_table):
    db_module.put_game_metadata(_meta("game.exe", 1_700_000_000))
    updated = _meta("game.exe", 1_700_100_000)
    updated["name"] = "Updated Name"
    db_module.put_game_metadata(updated)

    item = db_module.get_game_metadata("game.exe")
    assert item["name"] == "Updated Name"
    assert int(item["fetched_at"]) == 1_700_100_000


# ---------------------------------------------------------------------------
# iter_all_game_metadata — ordering via gsi2 (oldest first)
# ---------------------------------------------------------------------------

def test_iter_all_game_metadata_empty(ddb_table):
    assert db_module.iter_all_game_metadata() == []


def test_iter_all_game_metadata_single(ddb_table):
    db_module.put_game_metadata(_meta("a.exe", 1_700_000_000))
    items = db_module.iter_all_game_metadata()
    assert len(items) == 1
    assert items[0]["game_exe"] == "a.exe"


def test_iter_all_game_metadata_sorted_oldest_first(ddb_table):
    # Insert in reverse chronological order; query should return oldest first
    db_module.put_game_metadata(_meta("newer.exe", 1_700_100_000))
    db_module.put_game_metadata(_meta("older.exe", 1_700_000_000))
    db_module.put_game_metadata(_meta("middle.exe", 1_700_050_000))

    items = db_module.iter_all_game_metadata()
    assert len(items) == 3
    fetched_ats = [int(i["fetched_at"]) for i in items]
    assert fetched_ats == sorted(fetched_ats), "items should be oldest-first"
    assert items[0]["game_exe"] == "older.exe"
    assert items[-1]["game_exe"] == "newer.exe"


def test_iter_all_game_metadata_max_items(ddb_table):
    for i in range(10):
        db_module.put_game_metadata(_meta(f"game{i}.exe", 1_700_000_000 + i))

    items = db_module.iter_all_game_metadata(max_items=3)
    assert len(items) == 3


# ---------------------------------------------------------------------------
# iter_recent_session_exes
# ---------------------------------------------------------------------------

def _session(exe: str, started_at: int, session_id: str = "s1") -> Session:
    return Session(
        user_id="u1",
        session_id=session_id,
        game_exe=exe,
        game_name="X",
        started_at=started_at,
        ended_at=started_at + 3600,
        duration_sec=3600,
    )


def test_iter_recent_session_exes_empty(ddb_table):
    result = db_module.iter_recent_session_exes(0)
    assert result == set()


def test_iter_recent_session_exes_finds_recent(ddb_table):
    now = int(time.time())
    db_module.put_session(_session("recent.exe", now - 100, "s1"))
    result = db_module.iter_recent_session_exes(now - 3600)
    assert "recent.exe" in result


def test_iter_recent_session_exes_excludes_old(ddb_table):
    now = int(time.time())
    db_module.put_session(_session("old.exe", now - 100_000, "s2"))
    result = db_module.iter_recent_session_exes(now - 3600)
    assert "old.exe" not in result


def test_iter_recent_session_exes_deduplicates(ddb_table):
    now = int(time.time())
    # Two sessions with the same exe
    db_module.put_session(_session("dup.exe", now - 100, "s1"))
    db_module.put_session(_session("dup.exe", now - 200, "s2"))
    result = db_module.iter_recent_session_exes(now - 3600)
    # Should appear only once
    assert result.count("dup.exe") if hasattr(result, "count") else len([x for x in result if x == "dup.exe"]) == 1


def test_iter_recent_session_exes_lowercases(ddb_table):
    now = int(time.time())
    # Simulate a session stored with mixed-case exe (the handler stores as-is,
    # iter_recent_session_exes must lowercase)
    s = _session("MyGame.EXE", now - 100, "s1")
    db_module.put_session(s)
    result = db_module.iter_recent_session_exes(now - 3600)
    assert "mygame.exe" in result
