"""Steam playtime import — read locally, no Steam API key, no network.

Steam keeps per-account playtime in
    <Steam>/userdata/<accountid>/config/localconfig.vdf
        UserLocalConfigStore > Software > Valve > Steam > apps > <appid>
            "Playtime"   minutes, lifetime
            "LastPlayed" unix seconds
and the accounts signed in on this PC in <Steam>/config/loginusers.vdf.
Titles exist locally only for installed games (steamapps/appmanifest_*.acf);
the backend fills in the rest from Steam's public store data.
"""
from __future__ import annotations

import re
from pathlib import Path

from launchers.steam import _find_steam_install, parse_library_folders

_STEAMID64_BASE = 76561197960265728
_TOKEN = re.compile(r'"((?:[^"\\]|\\.)*)"|([{}])')


def parse_vdf(text: str) -> dict:
    """Minimal parser for Valve's text KeyValues format (case-insensitive keys
    are lowercased). Tolerates comments/garbage between tokens."""
    root: dict = {}
    stack = [root]
    key = None
    for m in _TOKEN.finditer(text):
        quoted, brace = m.group(1), m.group(2)
        if brace == "{":
            child: dict = {}
            if key is not None:
                stack[-1][key.lower()] = child
            stack.append(child)
            key = None
        elif brace == "}":
            if len(stack) > 1:
                stack.pop()
            key = None
        elif key is None:
            key = quoted.replace('\\"', '"').replace("\\\\", "\\")
        else:
            stack[-1][key.lower()] = quoted.replace('\\"', '"').replace("\\\\", "\\")
            key = None
    return root


def _read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return ""


def list_accounts(steam_root: Path | None = None) -> list[dict]:
    """Steam accounts used on this PC, most recently signed-in first."""
    steam_root = steam_root or _find_steam_install()
    if steam_root is None:
        return []
    users = parse_vdf(_read(steam_root / "config" / "loginusers.vdf")).get("users", {})
    accounts = []
    for steamid, info in users.items():
        if not steamid.isdigit() or not isinstance(info, dict):
            continue
        account_id = str(int(steamid) - _STEAMID64_BASE)
        played = read_playtime(account_id, steam_root)
        accounts.append({
            "account_id": account_id,
            "persona": info.get("personaname") or info.get("accountname") or f"Steam {account_id}",
            "most_recent": info.get("mostrecent") == "1",
            "last_login": int(info.get("timestamp") or 0),
            "games": len(played),
            "hours": round(sum(g["minutes"] for g in played) / 60, 1),
        })
    accounts.sort(key=lambda a: (a["most_recent"], a["last_login"]), reverse=True)
    return accounts


def read_playtime(account_id: str, steam_root: Path | None = None) -> list[dict]:
    """[{external_id, minutes, last_played}] for every game with playtime."""
    steam_root = steam_root or _find_steam_install()
    if steam_root is None or not str(account_id).isdigit():
        return []
    cfg = parse_vdf(_read(steam_root / "userdata" / str(account_id) / "config" / "localconfig.vdf"))
    apps = (cfg.get("userlocalconfigstore", {}).get("software", {}).get("valve", {})
            .get("steam", {}).get("apps", {}))
    games = []
    for appid, data in apps.items():
        if not appid.isdigit() or not isinstance(data, dict):
            continue
        try:
            minutes = int(data.get("playtime") or 0)
        except ValueError:
            continue
        if minutes <= 0:
            continue
        last = data.get("lastplayed")
        games.append({
            "external_id": appid,
            "minutes": minutes,
            "last_played": int(last) if last and last.isdigit() and int(last) > 0 else None,
        })
    return games


def installed_titles(steam_root: Path | None = None) -> dict[str, str]:
    """appid -> title for installed games (from their app manifests)."""
    steam_root = steam_root or _find_steam_install()
    if steam_root is None:
        return {}
    libraries = [steam_root / "steamapps"]
    libraries += [Path(p) / "steamapps" for p in parse_library_folders(steam_root / "steamapps" / "libraryfolders.vdf")]
    titles: dict[str, str] = {}
    for lib in libraries:
        if not lib.exists():
            continue
        for acf in lib.glob("appmanifest_*.acf"):
            state = parse_vdf(_read(acf)).get("appstate", {})
            appid, name = state.get("appid"), state.get("name")
            if appid and name:
                titles[appid] = name
    return titles


def collect(account_id: str, steam_root: Path | None = None) -> list[dict]:
    """Games to upload for one account. Unknown titles are sent empty; the
    backend resolves them."""
    titles = installed_titles(steam_root)
    games = read_playtime(account_id, steam_root)
    for g in games:
        g["name"] = titles.get(g["external_id"], "")
    return games
