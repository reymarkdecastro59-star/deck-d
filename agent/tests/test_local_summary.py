"""local_summary() powers the companion window's mini dashboard (this PC only)."""
import time

import session


def _closed(user, game, started_at, minutes):
    with session._get_conn() as conn:
        conn.execute(
            "INSERT INTO sessions (session_id, game_exe, game_name, started_at, ended_at, duration_sec, user_id) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (f"{game}-{started_at}", f"{game}.exe", game, started_at, started_at + minutes * 60, minutes * 60, user),
        )


def _at(y, m, d, h):
    return int(time.mktime((y, m, d, h, 0, 0, 0, 0, -1)))


NOW = _at(2026, 10, 4, 21)  # Sunday 4 Oct 2026, 21:00 local


def test_empty(tmp_deckd):
    s = session.local_summary("u1", now=NOW)
    assert s["today_sec"] == 0 and s["week_sec"] == 0
    assert s["last_session"] is None and s["live"] is None
    assert s["pending_sync"] == 0
    assert s["week_days"] == [0.0] * 7
    assert s["today_index"] == 6


def test_today_week_and_last(tmp_deckd):
    _closed("u1", "Balatro", _at(2026, 10, 4, 14), 60)     # today (Sun)
    _closed("u1", "Hades II", _at(2026, 9, 29, 20), 120)   # Tue this week
    _closed("u1", "Tunic", _at(2026, 9, 25, 20), 30)       # last week
    _closed("u2", "Other", _at(2026, 10, 4, 15), 90)       # other account
    s = session.local_summary("u1", now=NOW)
    assert s["today_sec"] == 3600
    assert s["week_sec"] == 3 * 3600
    assert s["week_days"][1] == 2.0 and s["week_days"][6] == 1.0
    assert s["last_session"]["game_name"] == "Balatro"
    assert s["pending_sync"] == 3  # all u1 closed rows are unsynced


def test_live_session_counts_toward_today(tmp_deckd):
    with session._get_conn() as conn:  # an open (still running) session
        conn.execute(
            "INSERT INTO sessions (session_id, game_exe, game_name, started_at, user_id) VALUES (?, ?, ?, ?, ?)",
            ("live-1", "lethal.exe", "Lethal Company", NOW - 1800, "u1"),
        )
    s = session.local_summary("u1", now=NOW)
    assert s["live"]["game_name"] == "Lethal Company"
    assert s["today_sec"] == 1800
