"""Start with Windows — a per-user Run entry (no admin rights needed).

HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\DECKD = "<exe>" --background
`--background` starts the tracker straight to the tray (no window) at sign-in.
Only meaningful for the packaged exe; running from source is a no-op.
"""
import sys

_RUN_KEY = r"Software\Microsoft\Windows\CurrentVersion\Run"
VALUE_NAME = "DECKD"
BACKGROUND_FLAG = "--background"


def _winreg():
    import winreg  # Windows-only; imported lazily so tests can stub it
    return winreg


def is_supported() -> bool:
    return sys.platform == "win32" and bool(getattr(sys, "frozen", False))


def command_line(exe_path: str | None = None) -> str:
    return f'"{exe_path or sys.executable}" {BACKGROUND_FLAG}'


def is_enabled() -> bool:
    if sys.platform != "win32":
        return False
    wr = _winreg()
    try:
        with wr.OpenKey(wr.HKEY_CURRENT_USER, _RUN_KEY, 0, wr.KEY_READ) as key:
            value, _ = wr.QueryValueEx(key, VALUE_NAME)
            return bool(value)
    except OSError:
        return False


def enable(exe_path: str | None = None) -> bool:
    """Register (or re-point) the Run entry at this exe. Returns success."""
    if sys.platform != "win32":
        return False
    wr = _winreg()
    try:
        with wr.OpenKey(wr.HKEY_CURRENT_USER, _RUN_KEY, 0, wr.KEY_SET_VALUE) as key:
            wr.SetValueEx(key, VALUE_NAME, 0, wr.REG_SZ, command_line(exe_path))
        return True
    except OSError:
        return False


def disable() -> bool:
    if sys.platform != "win32":
        return False
    wr = _winreg()
    try:
        with wr.OpenKey(wr.HKEY_CURRENT_USER, _RUN_KEY, 0, wr.KEY_SET_VALUE) as key:
            wr.DeleteValue(key, VALUE_NAME)
        return True
    except FileNotFoundError:
        return True  # already absent
    except OSError:
        return False


def ensure_default_on(marker_exists: bool, exe_path: str | None = None) -> bool:
    """First launch of the packaged app turns autostart on (the user can turn
    it off from the window or tray). Afterwards we only keep the entry
    pointing at the current exe if it is already enabled — never re-enable
    something the user switched off."""
    if not is_supported():
        return False
    if not marker_exists:
        return enable(exe_path)
    if is_enabled():
        return enable(exe_path)  # re-point after the exe moved/updated
    return False
