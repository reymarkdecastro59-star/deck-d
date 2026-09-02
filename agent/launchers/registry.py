import sys
from pathlib import Path

_UNINSTALL_KEYS: list[tuple[str, str]] = [
    ("HKLM", r"Software\Microsoft\Windows\CurrentVersion\Uninstall"),
    ("HKLM", r"Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
    ("HKCU", r"Software\Microsoft\Windows\CurrentVersion\Uninstall"),
]


def enumerate_installed_programs() -> list[tuple[str, Path]]:
    if sys.platform != "win32":
        return []

    import winreg
    hive_map = {
        "HKLM": winreg.HKEY_LOCAL_MACHINE,
        "HKCU": winreg.HKEY_CURRENT_USER,
    }

    results: list[tuple[str, Path]] = []
    seen: set[tuple[str, str]] = set()

    for hive_name, subkey_path in _UNINSTALL_KEYS:
        hive = hive_map[hive_name]
        try:
            base = winreg.OpenKey(hive, subkey_path)
        except OSError:
            continue

        try:
            i = 0
            while True:
                try:
                    subkey_name = winreg.EnumKey(base, i)
                except OSError:
                    break
                i += 1
                try:
                    with winreg.OpenKey(base, subkey_name) as k:
                        try:
                            name = winreg.QueryValueEx(k, "DisplayName")[0]
                            location = winreg.QueryValueEx(k, "InstallLocation")[0]
                        except OSError:
                            continue
                        if not name or not location:
                            continue
                        key = (name, location)
                        if key in seen:
                            continue
                        seen.add(key)
                        path = Path(location)
                        if path.exists() and path.is_dir():
                            results.append((name, path))
                except OSError:
                    continue
        finally:
            base.Close()

    return results
