from pathlib import Path

import pefile

# Only "strong" signals — DLLs almost exclusively used by games, not
# by CAD/office/browser apps. Bare DirectX/OpenGL/DXGI/OpenAL are
# NOT here on purpose: they're used by any GPU-accelerated app
# (Photoshop, SketchUp, AutoCAD, Zoom) and produce false positives.
_GAME_SIGNATURE_DLLS: frozenset[str] = frozenset({
    # Xbox / DirectInput controller — near-universal in games, absent in productivity apps
    "xinput1_1.dll", "xinput1_2.dll", "xinput1_3.dll", "xinput1_4.dll",
    "xinput9_1_0.dll", "dinput8.dll",
    # Game engine runtimes
    "unityplayer.dll",
    # Game vendor SDKs
    "steam_api.dll", "steam_api64.dll",
    "eossdk-win64-shipping.dll", "eossdk-win32-shipping.dll",
    "discord_game_sdk.dll",
    "gameoverlayrenderer.dll", "gameoverlayrenderer64.dll",
    # Game middleware
    "physxloader.dll", "physxloader_x64.dll",
    "physxcooking.dll", "physxcooking_x64.dll",
    "bink2w64.dll", "bink2w32.dll",
    "xactengine3_7.dll",
    "wwise.dll", "audiokinetic.wwise.dll",
    "fmod.dll", "fmodstudio.dll",
})

_MIN_EXE_SIZE = 100_000  # sub-100KB exes are almost always utilities


def is_likely_game(exe_path: Path) -> bool:
    if not exe_path.exists() or not exe_path.is_file():
        return False
    try:
        pe = pefile.PE(str(exe_path), fast_load=True)
        pe.parse_data_directories(
            directories=[pefile.DIRECTORY_ENTRY["IMAGE_DIRECTORY_ENTRY_IMPORT"]]
        )
    except Exception:
        return False

    if not hasattr(pe, "DIRECTORY_ENTRY_IMPORT"):
        return False

    imported = {
        entry.dll.decode(errors="ignore").lower()
        for entry in pe.DIRECTORY_ENTRY_IMPORT
        if entry.dll
    }
    return bool(imported & _GAME_SIGNATURE_DLLS)


def find_game_exes(
    install_dir: Path,
    max_depth: int = 3,
    max_check: int = 20,
) -> list[str]:
    if not install_dir.exists():
        return []
    base_depth = len(install_dir.parts)
    candidates: list[tuple[int, str]] = []
    checked = 0

    for exe_path in install_dir.rglob("*.exe"):
        if checked >= max_check:
            break
        if len(exe_path.parts) - base_depth > max_depth:
            continue
        try:
            size = exe_path.stat().st_size
        except OSError:
            continue
        if size < _MIN_EXE_SIZE:
            continue
        checked += 1
        if is_likely_game(exe_path):
            candidates.append((size, exe_path.name))

    if not candidates:
        return []
    candidates.sort(reverse=True)
    seen: set[str] = set()
    result: list[str] = []
    for _, name in candidates:
        key = name.lower()
        if key not in seen:
            seen.add(key)
            result.append(name)
    return result
