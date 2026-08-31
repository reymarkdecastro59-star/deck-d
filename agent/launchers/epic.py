import json
import sys
from pathlib import Path

_MANIFESTS_DIR = Path(r"C:\ProgramData\Epic\EpicGamesLauncher\Data\Manifests")


def parse_manifest(item_path: Path) -> tuple[str, str] | None:
    try:
        data = json.loads(item_path.read_text(encoding="utf-8", errors="ignore"))
    except (OSError, json.JSONDecodeError):
        return None

    display_name = data.get("DisplayName")
    launch_exe = data.get("LaunchExecutable")
    if not display_name or not launch_exe:
        return None
    if not launch_exe.lower().endswith(".exe"):
        return None

    categories = data.get("AppCategories") or []
    if categories and "games" not in {c.lower() for c in categories}:
        return None

    return Path(launch_exe).name, display_name


def get_installed_games(manifests_dir: Path | None = None) -> dict[str, str]:
    if sys.platform != "win32" and manifests_dir is None:
        return {}
    root = manifests_dir if manifests_dir is not None else _MANIFESTS_DIR
    if not root.exists():
        return {}

    tracked: dict[str, str] = {}
    for item in root.glob("*.item"):
        parsed = parse_manifest(item)
        if parsed:
            exe, name = parsed
            tracked[exe] = name
    return tracked
