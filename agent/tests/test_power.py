"""Tests for the sleep/hibernate power-event hook.

The message-pump plumbing is Windows-specific and integration-tested on real
hardware. What CI can verify here:
1. start()/stop() are safe on any OS.
2. The suspend/resume callbacks the watcher exposes actually work when the
   power hook fires them.
"""
import pytest

import session
import watcher
import power


# ---------- start/stop portability -----------------------------------------

def test_start_is_noop_on_non_windows_and_does_not_raise(monkeypatch):
    """On Linux/macOS the tray agent doesn't sleep in this app's usage, so
    start() must return cleanly rather than crashing on the missing pywin32."""
    monkeypatch.setattr(power, "_IS_WINDOWS", False)
    power.start(on_suspend=lambda: None, on_resume=lambda: None)
    power.stop()  # also safe


# ---------- watcher suspend/resume behaviour -------------------------------

def _mock_active_account(monkeypatch):
    monkeypatch.setattr(watcher, "get_active_user_id", lambda: "user-a")


def test_suspend_all_closes_every_active_session(tmp_deckd, monkeypatch):
    """Simulates: two games running, machine goes to sleep. Both sessions
    close so they don't accumulate 8h of phantom playtime."""
    _mock_active_account(monkeypatch)
    # Directly seed the watcher's internal tracker to avoid depending on
    # psutil scans in the test harness.
    with watcher._lock:
        watcher._active["a.exe"] = session.open_session("user-a", "a.exe", "A")
        watcher._active["b.exe"] = session.open_session("user-a", "b.exe", "B")

    closed = watcher.suspend_all()
    assert closed == 2
    assert not watcher.is_tracking("a.exe")
    assert not watcher.is_tracking("b.exe")

    # The rows are closed (have ended_at) and ready to sync.
    pending = session.get_unsynced("user-a")
    assert len(pending) == 2
    for row in pending:
        assert row["ended_at"] is not None


def test_suspend_all_is_safe_when_nothing_active(tmp_deckd):
    """No games running → suspend fires zero closes without raising."""
    assert watcher.suspend_all() == 0


def test_resume_check_reopens_still_running_games(tmp_deckd, monkeypatch):
    """After wake, any tracked game process still there → new session opens."""
    _mock_active_account(monkeypatch)
    monkeypatch.setattr(watcher, "get_tracked", lambda: {"a.exe": "A"})

    class _Proc:
        def __init__(self, name):
            self._n = name
        def name(self):
            return self._n

    monkeypatch.setattr(watcher.psutil, "process_iter",
                        lambda *_a, **_kw: [_Proc("a.exe"), _Proc("chrome.exe")])

    opened = watcher.resume_check()
    assert opened == 1
    assert watcher.is_tracking("a.exe")

    # Cleanup so subsequent tests don't inherit state.
    with watcher._lock:
        for exe in list(watcher._active):
            watcher._active.pop(exe)


def test_resume_check_skips_when_no_active_account(tmp_deckd, monkeypatch):
    """If the user logged out before sleeping, wake must not create orphans."""
    monkeypatch.setattr(watcher, "get_active_user_id", lambda: None)
    monkeypatch.setattr(watcher, "get_tracked", lambda: {"a.exe": "A"})

    class _Proc:
        def name(self):
            return "a.exe"

    monkeypatch.setattr(watcher.psutil, "process_iter",
                        lambda *_a, **_kw: [_Proc()])

    opened = watcher.resume_check()
    assert opened == 0
    assert not watcher.is_tracking("a.exe")


def test_suspend_then_resume_produces_two_separate_sessions(tmp_deckd, monkeypatch):
    """The whole loop: play, sleep, wake, play → two rows, not one 8h phantom."""
    _mock_active_account(monkeypatch)
    monkeypatch.setattr(watcher, "get_tracked", lambda: {"a.exe": "A"})

    class _Proc:
        def name(self):
            return "a.exe"
    monkeypatch.setattr(watcher.psutil, "process_iter",
                        lambda *_a, **_kw: [_Proc()])

    # Initial tracking (as if watcher._poll had seen it)
    with watcher._lock:
        watcher._active["a.exe"] = session.open_session("user-a", "a.exe", "A")

    # Sleep
    assert watcher.suspend_all() == 1
    assert not watcher.is_tracking("a.exe")

    # Wake
    assert watcher.resume_check() == 1
    assert watcher.is_tracking("a.exe")

    # Two rows now exist: the pre-sleep session (closed) and the post-wake
    # session (still open, will close when the game exits).
    with session._get_conn() as conn:
        count = conn.execute(
            "SELECT COUNT(*) FROM sessions WHERE user_id = ?", ("user-a",)
        ).fetchone()[0]
    assert count == 2

    # Cleanup
    with watcher._lock:
        for exe in list(watcher._active):
            watcher._active.pop(exe)
