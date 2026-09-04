"""
Windows sleep / hibernate handling for the DECK'D tray agent.

Without this, a session running when the machine suspends silently accrues
"phantom" playtime — the watcher polls, the game process is still there in
process-list snapshots taken before/after the suspend, and the session
close only fires when the game itself exits post-resume. The result is a
5-minute game session showing 8 hours because the user slept.

We hook WM_POWERBROADCAST via a hidden window created off the main thread.
On PBT_APMSUSPEND we close every active session using `watcher.suspend_all`.
On PBT_APMRESUMEAUTOMATIC we ask the watcher to re-open sessions for any
game that's still running.

Non-Windows platforms get a no-op start()/stop() so imports and tests work
everywhere.
"""
from __future__ import annotations

import sys
import threading
from typing import Callable, Optional

_IS_WINDOWS = sys.platform == "win32"

# Constants from winuser.h — duplicated here so non-Windows imports don't
# reach for pywin32.
_WM_POWERBROADCAST = 0x0218
_PBT_APMSUSPEND = 0x0004
_PBT_APMRESUMEAUTOMATIC = 0x0012
_PBT_APMRESUMESUSPEND = 0x0007

_thread: Optional[threading.Thread] = None
_hwnd = None
_on_suspend: Optional[Callable[[], None]] = None
_on_resume: Optional[Callable[[], None]] = None


def start(on_suspend: Callable[[], None], on_resume: Callable[[], None]) -> None:
    """Begin listening for WM_POWERBROADCAST. Idempotent; second call is a no-op.

    on_suspend fires just BEFORE the system goes to sleep.
    on_resume fires AFTER the system wakes.
    Both callbacks run on the message-pump thread — keep them short and
    thread-safe (dispatch heavy work back to the watcher's own thread).
    """
    global _thread, _on_suspend, _on_resume
    _on_suspend = on_suspend
    _on_resume = on_resume
    if not _IS_WINDOWS:
        # Silently succeed on non-Windows so main.py doesn't need to branch.
        # Sleep/hibernate on Linux/macOS is out of scope for the tray agent.
        return
    if _thread is not None:
        return
    _thread = threading.Thread(target=_run_message_pump, daemon=True)
    _thread.start()


def stop() -> None:
    """Post WM_QUIT to the pump so the thread exits cleanly on agent shutdown."""
    global _thread, _hwnd
    if not _IS_WINDOWS or _hwnd is None:
        return
    try:
        import win32api
        import win32con
        win32api.PostMessage(_hwnd, win32con.WM_QUIT, 0, 0)
    except Exception:
        pass
    _thread = None
    _hwnd = None


def _run_message_pump() -> None:
    """Windows-only: create a hidden window, register it, run the message pump."""
    global _hwnd
    import win32api
    import win32con
    import win32gui

    def wnd_proc(hwnd, msg, wparam, lparam):
        if msg == _WM_POWERBROADCAST:
            if wparam == _PBT_APMSUSPEND:
                if _on_suspend is not None:
                    try:
                        _on_suspend()
                    except Exception as exc:
                        print(f"[deckd] power on_suspend raised: {exc}", file=sys.stderr)
            elif wparam in (_PBT_APMRESUMEAUTOMATIC, _PBT_APMRESUMESUSPEND):
                if _on_resume is not None:
                    try:
                        _on_resume()
                    except Exception as exc:
                        print(f"[deckd] power on_resume raised: {exc}", file=sys.stderr)
            return True
        return win32gui.DefWindowProc(hwnd, msg, wparam, lparam)

    class_name = "DeckdPowerEventsHiddenWindow"
    hinst = win32api.GetModuleHandle(None)
    wc = win32gui.WNDCLASS()
    wc.lpszClassName = class_name
    wc.lpfnWndProc = wnd_proc
    wc.hInstance = hinst
    try:
        win32gui.RegisterClass(wc)
    except Exception:
        pass  # already registered from a prior process on this machine

    _hwnd = win32gui.CreateWindow(
        class_name, "DECK'D power listener",
        0, 0, 0, 0, 0, 0, 0, hinst, None,
    )
    # Message pump
    win32gui.PumpMessages()
