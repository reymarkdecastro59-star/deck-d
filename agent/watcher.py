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
