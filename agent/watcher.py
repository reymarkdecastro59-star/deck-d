import psutil
import time
import threading

import notifications
import token_store
from config import POLL_INTERVAL_SEC
from session import open_session, close_session
from games import get_tracked

_active: dict[str, str] = {}  # exe -> session_id
_lock = threading.Lock()
_running = False
_thread = None


def _poll_once() -> None:
    """One pass of the detection loop. Extracted so tests can call it directly."""
    running_exes = {p.name() for p in psutil.process_iter(["name"])}
    tracked = get_tracked()

    with _lock:
        # Detect new game starts
        for exe, name in tracked.items():
            if exe in running_exes and exe not in _active:
                store = token_store.read()
                active = store.active_healthy()
                if active is None:
                    # active_healthy() returns None iff (a) no active_user_id,
                    # OR (b) active_user_id is set but that account is revoked.
                    active_id = store.active_user_id
                    revoked = store.get(active_id) if active_id else None
                    if revoked is not None and revoked.revoked_at is not None:
                        notifications.on_active_account_revoked(exe, name, revoked.email)
                    elif store.accounts:
                        notifications.on_no_active_account(exe, name)
                    # else: 0 accounts stored — agent not set up, stay silent
                    continue
                sid = open_session(active.user_id, exe, name)
                _active[exe] = sid
                notifications.on_session_opened(exe, name, active)

        # Detect game stops
        for exe in list(_active):
            if exe not in running_exes:
                sid = _active.pop(exe)
                close_session(sid)
                notifications.on_orphan_exe_stopped(exe)


def _poll():
    while _running:
        _poll_once()
        time.sleep(POLL_INTERVAL_SEC)


def list_open_sessions() -> list[tuple[str, str]]:
    """Return [(exe, name)] for currently-open sessions. Used by main.py pre-switch check."""
    with _lock:
        tracked = get_tracked()
        return [(exe, tracked.get(exe, exe)) for exe in _active]


def start():
    global _running, _thread
    _running = True
    _thread = threading.Thread(target=_poll, daemon=True)
    _thread.start()


def stop():
    global _running
    _running = False


def suspend_all() -> int:
    """Called from the power-event thread just before the OS sleeps.

    Closes every session the watcher is currently tracking. Without this, a
    game running during sleep silently accrues the entire suspend duration
    (see conflict B2). Returns the number of sessions closed.

    Runs on the caller's thread; grabs the same lock the poll uses.
    """
    closed = 0
    with _lock:
        for exe in list(_active):
            sid = _active.pop(exe)
            close_session(sid)
            closed += 1
    return closed


def resume_check() -> int:
    """Called from the power-event thread after the OS wakes.

    Runs one immediate poll cycle: any tracked game still running gets a
    fresh session opened (started_at = post-resume timestamp). Returns the
    number of sessions re-opened.
    """
    running_exes = {p.name() for p in psutil.process_iter(["name"])}
    tracked = get_tracked()
    opened = 0
    with _lock:
        for exe, name in tracked.items():
            if exe in running_exes and exe not in _active:
                user_id = get_active_user_id()
                if user_id is None:
                    continue
                sid = open_session(user_id, exe, name)
                _active[exe] = sid
                opened += 1
    return opened


def is_tracking(exe: str) -> bool:
    """Test hook: True if the watcher has an open session for this exe."""
    with _lock:
        return exe in _active
