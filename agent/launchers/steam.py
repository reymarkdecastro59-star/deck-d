import re
import sys
from pathlib import Path

_EXE_BLACKLIST = {
    "unins000.exe", "unins001.exe",
    "unitycrashhandler32.exe", "unitycrashhandler64.exe",
    "crashreporter.exe", "crashreport.exe", "crashreport64.exe",
    "vc_redist.x64.exe", "vc_redist.x86.exe",
    "vcredist_x64.exe", "vcredist_x86.exe",
    "dxsetup.exe", "dxwebsetup.exe",
    "dotnetfx35.exe", "dotnetfx40.exe",
    "eossdk-win64-shipping.exe",
    "easyanticheat_setup.exe",
    "battleye_launcher.exe",
}

_MIN_EXE_SIZE = 100_000  # 100 KB — filters redistributables/uninstallers


def _find_steam_install() -> Path | None:
    if sys.platform != "win32":
        return None
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam") as key:
            return Path(winreg.QueryValueEx(key, "SteamPath")[0])
    except OSError:
        pass
    default = Path(r"C:\Program Files (x86)\Steam")
    return default if default.exists() else None


def parse_library_folders(vdf_path: Path) -> list[Path]:
    try:
        text = vdf_path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return []
    raw = re.findall(r'"path"\s+"([^"]+)"', text)
    return [Path(p.replace("\\\\", "\\")) for p in raw]


def parse_appmanifest(acf_path: Path) -> tuple[str, str] | None:
    try:
        text = acf_path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return None
    name = re.search(r'"name"\s+"([^"]+)"', text)
    installdir = re.search(r'"installdir"\s+"([^"]+)"', text)
    if not name or not installdir:
        return None
    return name.group(1), installdir.group(1)


def find_game_exe(install_dir: Path, max_depth: int = 3) -> str | None:
    if not install_dir.exists():
        return None
    base_depth = len(install_dir.parts)
    dir_slug = re.sub(r"[^a-z0-9]", "", install_dir.name.lower())

    candidates: list[tuple[int, int, str]] = []  # (name_match, size, exe_name)
    for exe_path in install_dir.rglob("*.exe"):
        if len(exe_path.parts) - base_depth > max_depth:
            continue
        name = exe_path.name.lower()
        if name in _EXE_BLACKLIST or name.startswith("unins"):
            continue
        try:
            size = exe_path.stat().st_size
        except OSError:
            continue
        if size < _MIN_EXE_SIZE:
            continue
        exe_slug = re.sub(r"[^a-z0-9]", "", exe_path.stem.lower())
        name_match = 1 if exe_slug and (exe_slug in dir_slug or dir_slug in exe_slug) else 0
        candidates.append((name_match, size, exe_path.name))

    if not candidates:
        return None
    candidates.sort(reverse=True)
    return candidates[0][2]


def get_installed_games() -> dict[str, str]:
    steam = _find_steam_install()
    if steam is None:
        return {}
    root_libraries = [steam / "steamapps"]
    extra = parse_library_folders(steam / "steamapps" / "libraryfolders.vdf")
    root_libraries.extend(Path(p) / "steamapps" for p in extra)

    tracked: dict[str, str] = {}
    seen_libs: set[Path] = set()
    for lib in root_libraries:
        if not lib.exists():
            continue
        resolved = lib.resolve()
        if resolved in seen_libs:
            continue
        seen_libs.add(resolved)
        for acf in lib.glob("appmanifest_*.acf"):
            parsed = parse_appmanifest(acf)
            if not parsed:
                continue
            name, installdir = parsed
            exe = find_game_exe(lib / "common" / installdir)
            if exe:
                tracked[exe] = name
    return tracked
