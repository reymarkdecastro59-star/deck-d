import logging
import os
import time
from datetime import datetime, timezone, timedelta
from decimal import Decimal

import requests

from shared.canonical import with_cache_id
from shared.db import iter_all_game_metadata, iter_recent_session_games, put_game_metadata, put_trending_daily
from shared.rawg import fetch_metadata
from shared import steam_api
from shared.safe_log import safe_error

logger = logging.getLogger(__name__)

_DAY = 86_400
_RAWG_BASE = "https://api.rawg.io/api"
# Keep the top N results after filtering.
_TRENDING_LIMIT = 20


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


def _api_key() -> str:
    return os.environ.get("RAWG_API_KEY", "")


def _fetch_rawg_trending() -> list[dict] | None:
    """
    Query RAWG for games released in the last 90 days, ranked by how many
    players added them to their libraries ("-added"). The previous query also
    required a Metacritic score, which RAWG rarely has for new releases, so it
    returned nothing and Trending stayed empty.

    Returns None on any network or non-200 error so the caller can decide
    NOT to overwrite the existing DynamoDB item.
    """
    now_utc = datetime.now(timezone.utc)
    date_to = now_utc.strftime("%Y-%m-%d")
    date_from = (now_utc - timedelta(days=90)).strftime("%Y-%m-%d")

    params = {
        "ordering": "-added",
        "dates": f"{date_from},{date_to}",
        "page_size": 25,
        "key": _api_key(),
    }

    try:
        resp = requests.get(f"{_RAWG_BASE}/games", params=params, timeout=15)
    except requests.RequestException as exc:
        logger.error("trending_rawg_request_error err=%s", safe_error(exc))
        return None

    if not resp.ok:
        logger.error(
            "trending_rawg_non_ok status=%s body=%.200s",
            resp.status_code,
            resp.text,
        )
        return None

    results = resp.json().get("results") or []

    games: list[dict] = []
    for r in results:
        slug = r.get("slug", "")
        name = r.get("name", "")
        if not slug or not name:
            continue
        raw_rating = r.get("rating")
        rating = Decimal(str(raw_rating)) if raw_rating is not None else None
        games.append({
            "rawg_id": r.get("id"),
            "name": name,
            "slug": slug,
            "background_image": r.get("background_image"),
            "genres": [g["name"] for g in (r.get("genres") or [])],
            "metacritic": r.get("metacritic"),
            "released": r.get("released"),
            "rating": rating,
        })
        if len(games) >= _TRENDING_LIMIT:
            break

    return games


def _refresh_trending() -> None:
    """
    Trending = what's popular right now, the same for everyone. Source:
    Steam's most-played chart (needs STEAM_API_KEY); RAWG's recent releases
    are the fallback when Steam isn't configured or fails.
    On any failure: log loudly and return without touching DynamoDB,
    so the existing (possibly stale) item keeps serving.
    """
    games = steam_api.most_played() if steam_api.api_key() else None
    source = "steam"
    if games is None:
        games = _fetch_rawg_trending()
        source = "rawg"
    if games is None:
        logger.error(
            "trending_refresh_skipped reason=rawg_failure "
            "existing_item_preserved=true"
        )
        return

    updated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # No TTL: the item is overwritten daily, and on failure the stale item must
    # keep serving (consumers show its age from `updated_at`). See B8.
    put_trending_daily(games=games, updated_at=updated_at, source=source)
    logger.info("trending_refresh_complete source=%s count=%d updated_at=%s", source, len(games), updated_at)


def handler(event: dict, context) -> dict:
    # The 6-hourly schedule refreshes only Trending ("popular right now");
    # the full metadata pass stays daily.
    if (event or {}).get("trending_only"):
        _refresh_trending()
        return {"trending_only": True}
    stale_days = _env_int("REFRESH_STALE_DAYS", 7)
    # Was 30: one failed lookup (e.g. a missing API key) hid art for a month.
    failed_retry_days = _env_int("FAILED_RETRY_DAYS", 1)
    max_calls = _env_int("MAX_CALLS_PER_RUN", 200)

    now = int(time.time())
    stale_cutoff = now - stale_days * _DAY
    failed_cutoff = now - failed_retry_days * _DAY
    session_since = now - 30 * _DAY

    # ── a) existing cache items ────────────────────────────────────────────
    cached = iter_all_game_metadata()
    cached_map: dict[str, dict] = {item.get("cache_id") or item["game_exe"]: item for item in cached}

    # ── b) new exe + title pairs from recent sessions ─────────────────────
    recent = iter_recent_session_games(session_since)  # {cache id: (exe, title)}
    new_exes = recent.keys() - cached_map.keys()

    # ── c) stale items that need refresh ──────────────────────────────────
    stale_exes: list[str] = []
    for exe, item in cached_map.items():
        fetched_at = int(item.get("fetched_at", 0))
        failed = bool(item.get("resolution_failed", False))
        if failed:
            if fetched_at < failed_cutoff:
                stale_exes.append(exe)
        else:
            if fetched_at < stale_cutoff:
                stale_exes.append(exe)

    # ── d) merge queues (new first, then stale) and cap ───────────────────
    queue = list(new_exes) + stale_exes
    queue = queue[:max_calls]

    processed = 0
    new_count = 0
    refreshed = 0
    failed_count = 0

    for cid in queue:
        if cid in recent:
            exe, title = recent[cid]
        else:  # stale cache entry: re-run the same lookup it was made with
            exe, title = cached_map[cid]["game_exe"], cached_map[cid].get("title")
        metadata = with_cache_id(fetch_metadata(exe, title), exe, title)
        put_game_metadata(metadata)
        processed += 1
        if cid in new_exes:
            new_count += 1
        else:
            refreshed += 1
        if metadata.get("resolution_failed"):
            failed_count += 1

    result = {
        "processed": processed,
        "new": new_count,
        "refreshed": refreshed,
        "failed": failed_count,
    }
    logger.info("refresh_metadata_complete %s", result)

    # ── e) trending refresh (RAWG failure is non-fatal) ───────────────────
    _refresh_trending()

    return result
