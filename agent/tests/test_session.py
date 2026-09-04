"""
Tests for the multi-account-aware local session queue.

Covers user_id column semantics, per-account filtering, and the legacy
schema migration for pre-Phase-1 installs.
"""
import sqlite3
import os

import pytest

import session


def _close_all(user_id: str, exe: str = "game.exe", name: str = "Game") -> str:
    sid = session.open_session(user_id, exe, name)
    session.close_session(sid)
    return sid


# ---------- schema migration ------------------------------------------------

def test_schema_migration_adds_user_id_column(tmp_deckd, monkeypatch):
    """A pre-Phase-1 SQLite file (no user_id column) upgrades cleanly."""
    # Simulate an old install by creating the DB with the pre-Phase-1 schema.
    conn = sqlite3.connect(session.DB_PATH)
    conn.execute("""
        CREATE TABLE sessions (
            session_id   TEXT PRIMARY KEY,
            game_exe     TEXT NOT NULL,
            game_name    TEXT NOT NULL,
            started_at   INTEGER NOT NULL,
            ended_at     INTEGER,
            duration_sec INTEGER,
            label        TEXT DEFAULT 'tracked',
            synced       INTEGER DEFAULT 0
        )
    """)
    conn.execute(
        "INSERT INTO sessions (session_id, game_exe, game_name, started_at, ended_at, "
        "duration_sec) VALUES ('legacy-1', 'old.exe', 'Old Game', 1000, 2000, 1000)"
    )
    conn.commit()
    conn.close()

    # First call to _get_conn() should ALTER TABLE to add user_id.
    assert session.count_orphan_rows() == 1


# ---------- lifecycle -------------------------------------------------------

def test_open_close_roundtrip_tags_user_id(tmp_deckd):
    sid = _close_all("user-a")
    pending = session.get_unsynced("user-a")
    assert len(pending) == 1
    assert pending[0]["session_id"] == sid
    assert pending[0]["user_id"] == "user-a"


def test_get_unsynced_filters_by_user_id(tmp_deckd):
    _close_all("user-a")
    _close_all("user-a")
    _close_all("user-b")

    a_rows = session.get_unsynced("user-a")
    b_rows = session.get_unsynced("user-b")
    assert len(a_rows) == 2
    assert len(b_rows) == 1
    assert all(r["user_id"] == "user-a" for r in a_rows)


def test_get_unsynced_skips_open_sessions(tmp_deckd):
    """A session that was opened but never closed must not be returned."""
    session.open_session("user-a", "game.exe", "Game")  # never closed
    _close_all("user-a")  # closed
    assert len(session.get_unsynced("user-a")) == 1


def test_mark_synced_removes_from_pending(tmp_deckd):
    sid = _close_all("user-a")
    session.mark_synced(sid)
    assert session.get_unsynced("user-a") == []


def test_get_pending_user_ids_returns_distinct(tmp_deckd):
    _close_all("user-a")
    _close_all("user-a")
    _close_all("user-b")
    ids = set(session.get_pending_user_ids())
    assert ids == {"user-a", "user-b"}


def test_get_pending_user_ids_excludes_null(tmp_deckd):
    """Legacy rows with NULL user_id are not returned — they'd have no token to sync with."""
    # Insert a legacy row directly (bypassing open_session's NOT NULL contract).
    conn = sqlite3.connect(session.DB_PATH)
    session._get_conn().close()  # ensure schema exists
    conn.execute(
        "INSERT INTO sessions (session_id, game_exe, game_name, started_at, ended_at, "
        "duration_sec, synced) VALUES ('orphan', 'x.exe', 'X', 1000, 2000, 1000, 0)"
    )
    conn.commit()
    conn.close()
    _close_all("user-a")
    assert session.get_pending_user_ids() == ["user-a"]


# ---------- legacy row migration --------------------------------------------

def test_migrate_legacy_rows_backfills_null(tmp_deckd):
    # Seed 3 orphan rows
    conn = sqlite3.connect(session.DB_PATH)
    session._get_conn().close()  # ensure schema
    for i in range(3):
        conn.execute(
            "INSERT INTO sessions (session_id, game_exe, game_name, started_at, ended_at, "
            "duration_sec, synced) VALUES (?, 'x.exe', 'X', 1000, 2000, 1000, 0)",
            (f"orphan-{i}",),
        )
    conn.commit()
    conn.close()
    assert session.count_orphan_rows() == 3

    updated = session.migrate_legacy_rows("user-a")
    assert updated == 3
    assert session.count_orphan_rows() == 0
    assert len(session.get_unsynced("user-a")) == 3


def test_migrate_legacy_rows_does_not_touch_new_rows(tmp_deckd):
    """user-b's rows must not be re-attributed when user-a claims orphans."""
    _close_all("user-b")

    # Seed 1 orphan
    conn = sqlite3.connect(session.DB_PATH)
    session._get_conn().close()
    conn.execute(
        "INSERT INTO sessions (session_id, game_exe, game_name, started_at, ended_at, "
        "duration_sec, synced) VALUES ('orphan', 'x.exe', 'X', 1000, 2000, 1000, 0)"
    )
    conn.commit()
    conn.close()

    session.migrate_legacy_rows("user-a")
    assert len(session.get_unsynced("user-a")) == 1
    assert len(session.get_unsynced("user-b")) == 1  # untouched
