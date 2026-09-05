import sys
import psutil
import time
import threading
from config import POLL_INTERVAL_SEC
from session import open_session, close_session
from games import get_tracked
from auth import get_active_user_id

_active: dict[str, str] = {}  # exe -> session_id
_lock = threading.Lock()
_running = False
_thread = None


def _poll():
    while _running:
        running_exes = {p.name() for p in psutil.process_iter(["name"])}
        tracked = get_tracked()

        with _lock:
            # Detect new game starts
            for exe, name in tracked.items():
                if exe in running_exes and exe not in _active:
                    user_id = get_active_user_id()
                    if user_id is None:
                        # No active account — cannot attribute this session to anyone.
                        # Skip rather than store an orphan row (see A6 in conflict audit).
                        print(f"[deckd] {exe} started but no active account — session skipped",
                              file=sys.stderr)
                        continue
                    sid = open_session(user_id, exe, name)
                    _active[exe] = sid

            # Detect game stops
            for exe in list(_active):
                if exe not in running_exes:
                    sid = _active.pop(exe)
                    close_session(sid)

        time.sleep(POLL_INTERVAL_SEC)


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
