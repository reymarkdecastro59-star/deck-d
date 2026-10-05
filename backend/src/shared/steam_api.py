"""Steam: verified sign-in (OpenID 2.0) and the official Web API.

Connect flow (no Steam password ever reaches DECK'D):
  1. POST /steam/connect      → we mint a one-time nonce for this user and
                                return Steam's login URL; return_to is the
                                DECK'D web app (allow-listed origin) + nonce.
  2. Steam signs the user in and redirects back with openid.* params.
  3. POST /steam/link         → the web forwards those params; we
     a) check return_to is exactly the one we issued (nonce, origin),
     b) ask Steam to confirm the assertion (check_authentication —
        Steam also makes response_nonce single-use, so no replay),
     c) take the SteamID from claimed_id.
Then GetOwnedGames returns the library with lifetime playtime. If the
user's "Game details" are private Steam returns no games; the caller falls
back to the tracker reading Steam on the PC.
"""
from __future__ import annotations

import logging
import os
import re
from typing import Optional
from urllib.parse import urlencode, urlparse

import requests

logger = logging.getLogger(__name__)

OPENID_LOGIN = "https://steamcommunity.com/openid/login"
_OPENID_NS = "http://specs.openid.net/auth/2.0"
_IDENTIFIER_SELECT = "http://specs.openid.net/auth/2.0/identifier_select"
_CLAIMED_ID = re.compile(r"^https://steamcommunity\.com/openid/id/(7656119\d{10})$")
_API = "https://api.steampowered.com"
STEAMID64_BASE = 76561197960265728


def api_key() -> str:
    return os.environ.get("STEAM_API_KEY", "")


def allowed_origins() -> list[str]:
    raw = os.environ.get("WEB_ORIGINS", "http://localhost:5173")
    return [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]


def origin_allowed(origin: str) -> bool:
    if not origin:
        return False
    parsed = urlparse(origin)
    clean = f"{parsed.scheme}://{parsed.netloc}"
    return parsed.scheme in ("http", "https") and clean == origin.rstrip("/") and clean in allowed_origins()


def return_to_for(origin: str, nonce: str) -> str:
    return f"{origin.rstrip('/')}/settings/steam?{urlencode({'state': nonce})}"


def login_url(return_to: str, realm: str) -> str:
    params = {
        "openid.ns": _OPENID_NS,
        "openid.mode": "checkid_setup",
        "openid.return_to": return_to,
        "openid.realm": realm.rstrip("/"),
        "openid.identity": _IDENTIFIER_SELECT,
        "openid.claimed_id": _IDENTIFIER_SELECT,
    }
    return f"{OPENID_LOGIN}?{urlencode(params)}"


def verify_assertion(params: dict, expected_return_to: str) -> Optional[str]:
    """Return the verified SteamID64, or None. Never raises."""
    try:
        openid = {k: str(v) for k, v in (params or {}).items() if k.startswith("openid.")}
        if openid.get("openid.mode") != "id_res":
            return None
        if openid.get("openid.op_endpoint") != OPENID_LOGIN:
            return None
        if openid.get("openid.return_to") != expected_return_to:
            return None
        claimed = openid.get("openid.claimed_id", "")
        match = _CLAIMED_ID.match(claimed)
        if not match or openid.get("openid.identity") != claimed:
            return None
        # Only the signed fields matter to Steam; send everything back as-is.
        check = dict(openid)
        check["openid.mode"] = "check_authentication"
        resp = requests.post(OPENID_LOGIN, data=check, timeout=8)
        if not resp.ok or "is_valid:true" not in resp.text:
            logger.warning("steam_openid_rejected status=%s", resp.status_code)
            return None
        return match.group(1)
    except requests.RequestException as exc:
        logger.warning("steam_openid_error err=%s", exc)
        return None


def persona(steamid: str) -> Optional[dict]:
    """{'name', 'avatar'} for display, or None."""
    try:
        resp = requests.get(
            f"{_API}/ISteamUser/GetPlayerSummaries/v2/",
            params={"key": api_key(), "steamids": steamid},
            timeout=8,
        )
        players = (resp.json().get("response") or {}).get("players") or [] if resp.ok else []
        if not players:
            return None
        p = players[0]
        return {"name": str(p.get("personaname") or "")[:64], "avatar": p.get("avatarmedium")}
    except (requests.RequestException, ValueError):
        return None


class SteamPrivate(Exception):
    """The profile hides game details, so the API returns no library."""


class SteamUnavailable(Exception):
    """Steam's API failed (network, key, 5xx)."""


def owned_games(steamid: str) -> list[dict]:
    """Every owned game with playtime > 0, in the import upload format."""
    try:
        resp = requests.get(
            f"{_API}/IPlayerService/GetOwnedGames/v1/",
            params={
                "key": api_key(),
                "steamid": steamid,
                "include_appinfo": 1,
                "include_played_free_games": 1,
                "format": "json",
            },
            timeout=15,
        )
    except requests.RequestException as exc:
        raise SteamUnavailable(str(exc)) from exc
    if resp.status_code in (401, 403):
        raise SteamUnavailable(f"HTTP {resp.status_code}")
    if not resp.ok:
        raise SteamUnavailable(f"HTTP {resp.status_code}")
    data = (resp.json() or {}).get("response") or {}
    if "games" not in data:  # private "Game details" → empty response object
        raise SteamPrivate()
    games = []
    for g in data["games"]:
        minutes = int(g.get("playtime_forever") or 0)
        if minutes <= 0 or not g.get("appid"):
            continue
        last = int(g.get("rtime_last_played") or 0)
        games.append({
            "external_id": str(int(g["appid"])),
            "name": str(g.get("name") or "")[:200],
            "minutes": minutes,
            "last_played": last or None,
        })
    return games


# ── Trending: Steam's "most played right now" chart ─────────────────────────

_ASSETS = "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps"
_SOFTWARE_GENRES = {
    "Utilities", "Design & Illustration", "Animation & Modeling", "Audio Production",
    "Video Production", "Photo Editing", "Software Training", "Web Publishing",
    "Education", "Accounting", "Game Development",
}


def _app_details(appid: int) -> Optional[dict]:
    """Public store data: type, name, genres. None if unavailable."""
    try:
        resp = requests.get(
            "https://store.steampowered.com/api/appdetails",
            params={"appids": appid, "filters": "basic,genres"},
            timeout=8,
        )
        entry = (resp.json() or {}).get(str(appid)) or {} if resp.ok else {}
        return entry.get("data") if entry.get("success") else None
    except (requests.RequestException, ValueError):
        return None


def most_played(limit: int = 10) -> Optional[list[dict]]:
    """Today's most played games on Steam (by peak concurrent players).

    The same list for every user — Trending is popularity, not personal
    data. Non-games in Steam's chart (tools, wallpaper apps) are skipped.
    Returns None on failure so the caller keeps yesterday's list.
    """
    try:
        resp = requests.get(
            f"{_API}/ISteamChartsService/GetMostPlayedGames/v1/",
            params={"key": api_key()},
            timeout=15,
        )
        if not resp.ok:
            logger.error("steam_charts_non_ok status=%s", resp.status_code)
            return None
        ranks = (resp.json().get("response") or {}).get("ranks") or []
    except (requests.RequestException, ValueError) as exc:
        logger.error("steam_charts_error err=%s", exc)
        return None

    games: list[dict] = []
    for entry in ranks:
        appid = entry.get("appid")
        if not appid:
            continue
        details = _app_details(int(appid))
        if not details or details.get("type") != "game" or not details.get("name"):
            continue
        # Steam types some tools as "game" (e.g. Wallpaper Engine); its
        # software genres give them away.
        genres = {g.get("description") for g in details.get("genres") or []}
        if genres & _SOFTWARE_GENRES:
            continue
        games.append({
            "steam_appid": int(appid),
            "rawg_id": None,
            "name": str(details["name"])[:200],
            "slug": None,
            "genres": [g.get("description") for g in details.get("genres") or [] if g.get("description")][:3],
            "background_image": f"{_ASSETS}/{appid}/capsule_616x353.jpg",
            "cover_image": f"{_ASSETS}/{appid}/library_600x900.jpg",
            "rank": len(games) + 1,
            "chart_rank": int(entry.get("rank") or 0),
            "last_week_rank": int(entry.get("last_week_rank") or 0) or None,
            "peak_players": int(entry.get("peak_in_game") or 0),
        })
        if len(games) >= limit:
            break
    return games or None
