import psutil
import time
import threading
from config import TRACKED_GAMES, POLL_INTERVAL_SEC
from session import open_session, close_session

_active: dict[str, str] = {}  # exe -> session_id
_lock = threading.Lock()
_running = False
_thread = None


def _poll():
    while _running:
        running_exes = {p.name() for p in psutil.process_iter(["name"])}

        with _lock:
            # Detect new game starts
            for exe, name in TRACKED_GAMES.items():
                if exe in running_exes and exe not in _active:
                    sid = open_session(exe, name)
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
