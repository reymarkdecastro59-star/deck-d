"""One tracker per Windows user.

Two trackers would record every game twice. The first instance owns a named
mutex; a second launch signals a named event ("show your window") and exits,
so double-clicking the app always brings the existing window forward.
"""
import sys
import threading

_MUTEX_NAME = "Local\\DECKD.Tracker.Instance"
_EVENT_NAME = "Local\\DECKD.Tracker.Show"
_mutex = None


def acquire() -> bool:
    """True if we are the only instance (keep running), False if another runs."""
    global _mutex
    if sys.platform != "win32":
        return True
    import win32api
    import win32event
    import winerror

    _mutex = win32event.CreateMutex(None, False, _MUTEX_NAME)
    return win32api.GetLastError() != winerror.ERROR_ALREADY_EXISTS


def signal_existing() -> None:
    """Ask the running instance to show its window."""
    if sys.platform != "win32":
        return
    import win32event

    try:
        ev = win32event.OpenEvent(win32event.EVENT_MODIFY_STATE, False, _EVENT_NAME)
        win32event.SetEvent(ev)
    except Exception:  # noqa: BLE001 — best effort
        pass


def listen_for_show(on_show) -> None:
    """Background thread: call on_show() whenever another launch signals us."""
    if sys.platform != "win32":
        return
    import win32event

    ev = win32event.CreateEvent(None, False, False, _EVENT_NAME)

    def _loop():
        while True:
            if win32event.WaitForSingleObject(ev, win32event.INFINITE) == win32event.WAIT_OBJECT_0:
                try:
                    on_show()
                except Exception:  # noqa: BLE001
                    pass

    threading.Thread(target=_loop, daemon=True, name="deckd-show-listener").start()
