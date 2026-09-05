"""Tests for Phase 5 crash recovery + sync backoff + dead-letter."""
import sqlite3
import time

import pytest

import session


# ---------- crash recovery --------------------------------------------------

def test_recover_orphan_closes_recent_open_session(tmp_deckd):
    """A session opened moments ago and left open (agent crashed) closes
    with zero duration — we don't know the real end time."""
    sid = session.open_session("user-a", "game.exe", "Game")
    assert session.get_open_session_count() == 1
    closed, dead = session.recover_orphan_sessions()
    assert (closed, dead) == (1, 0)
    assert session.get_open_session_count() == 0

    rows = session.get_unsynced("user-a")
    assert len(rows) == 1
    assert rows[0]["session_id"] == sid
    assert rows[0]["duration_sec"] == 0
    assert rows[0]["ended_at"] == rows[0]["started_at"]


def test_recover_orphan_dead_letters_ancient_open_session(tmp_deckd):
    """An orphan >24h old is dead-lettered — we've long since lost the
    opportunity to reconstruct it, and shouldn't keep the row pending."""
    # Seed a row directly with a very old started_at.
    conn = sqlite3.connect(session.DB_PATH)
    session._get_conn().close()  # ensure schema exists
    old_start = int(time.time()) - 48 * 3600  # 48h ago
    conn.execute(
        "INSERT INTO sessions (session_id, game_exe, game_name, started_at, "
        "ended_at, duration_sec, user_id) VALUES ('ancient', 'g.exe', 'G', ?, "
        "NULL, NULL, 'user-a')",
        (old_start,),
    )
    conn.commit()
    conn.close()

    closed, dead = session.recover_orphan_sessions()
    assert (closed, dead) == (0, 1)
    # Not returned by get_unsynced — it's dead-lettered.
    assert session.get_unsynced("user-a") == []
    # But it IS still in the DB (for audit).
    assert session.get_dead_letter_count("user-a") == 1


def test_recover_orphan_leaves_normal_sessions_alone(tmp_deckd):
    """Sessions that were properly closed must not be touched."""
    sid = session.open_session("user-a", "game.exe", "Game")
    session.close_session(sid)  # cleanly closed with real duration
    rows_before = session.get_unsynced("user-a")

    closed, dead = session.recover_orphan_sessions()
    assert (closed, dead) == (0, 0)
    rows_after = session.get_unsynced("user-a")
    assert rows_before == rows_after


# ---------- dead-letter surfacing ------------------------------------------

def test_dead_letter_pending_moves_rows_to_tombstone(tmp_deckd):
    session.open_session("user-a", "g.exe", "G")
    sid = session.open_session("user-a", "g2.exe", "G2")
    session.close_session(sid)  # only this one is eligible (has ended_at)

    n = session.dead_letter_pending("user-a")
    assert n == 1
    assert session.get_unsynced("user-a") == []
    assert session.get_dead_letter_count("user-a") == 1


def test_dead_letter_count_excludes_other_users(tmp_deckd):
    sid = session.open_session("user-a", "g.exe", "G")
    session.close_session(sid)
    session.dead_letter_pending("user-a")

    assert session.get_dead_letter_count("user-a") == 1
    assert session.get_dead_letter_count("user-b") == 0
    assert session.get_dead_letter_count() == 1  # global


# ---------- backoff state ---------------------------------------------------

def test_fresh_user_has_zero_backoff(tmp_deckd):
    """A user with no recorded failure is never backed off."""
    now = 1_000_000
    assert session.is_backoff_expired("user-a", now)
    state = session.get_sync_state("user-a")
    assert state == {
        "failure_count": 0,
        "next_retry_at": 0,
        "first_failure_at": None,
        "auth_failed": 0,
    }


def test_record_sync_failure_sets_backoff(tmp_deckd):
    now = 1_000_000
    session.record_sync_failure("user-a", now, backoff_sec=60)
    assert not session.is_backoff_expired("user-a", now + 30)
    assert session.is_backoff_expired("user-a", now + 60)


def test_record_sync_success_clears_state(tmp_deckd):
    now = 1_000_000
    session.record_sync_failure("user-a", now, backoff_sec=60)
    session.record_sync_success("user-a")
    state = session.get_sync_state("user-a")
    assert state["failure_count"] == 0
    assert state["next_retry_at"] == 0


def test_mark_auth_failed_blocks_all_syncs(tmp_deckd):
    """auth_failed=1 → never eligible for retry regardless of clock."""
    now = 1_000_000
    session.mark_auth_failed("user-a", now)
    # Even far in the future, still blocked
    assert not session.is_backoff_expired("user-a", now + 10 * 24 * 3600)


def test_clear_auth_failed_resumes_sync(tmp_deckd):
    """A successful re-login clears the auth_failed flag."""
    now = 1_000_000
    session.mark_auth_failed("user-a", now)
    session.clear_auth_failed("user-a")
    assert session.is_backoff_expired("user-a", now)


def test_failure_count_increments_across_calls(tmp_deckd):
    now = 1_000_000
    session.record_sync_failure("user-a", now, backoff_sec=60)
    session.record_sync_failure("user-a", now + 100, backoff_sec=120)
    state = session.get_sync_state("user-a")
    assert state["failure_count"] == 2
    assert state["first_failure_at"] == now  # preserved from first failure


# ---------- schema migration ------------------------------------------------

def test_sync_state_table_created(tmp_deckd):
    """Fresh install has the sync_state table via _run_migration."""
    session._get_conn().close()  # trigger migration
    conn = sqlite3.connect(session.DB_PATH)
    tables = {r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    )}
    conn.close()
    assert "sync_state" in tables
    assert "sessions" in tables
