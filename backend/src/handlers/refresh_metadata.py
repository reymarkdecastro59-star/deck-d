import logging
import os
import time
from datetime import datetime, timezone, timedelta
from decimal import Decimal

import requests

from shared.db import iter_all_game_metadata, iter_recent_session_exes, put_game_metadata, put_trending_daily
from shared.rawg import fetch_metadata

logger = logging.getLogger(__name__)

_DAY = 86_400
_RAWG_BASE = "https://api.rawg.io/api"
# TTL for the trending item: 26 hours so a cron failure still serves stale data.
_TRENDING_TTL_SEC = 26 * 3600
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
    Query RAWG for recently-added, well-reviewed games and return a list of
    trimmed game objects.

    Returns None on any network or non-200 error so the caller can decide
    NOT to overwrite the existing DynamoDB item.
    """
    now_utc = datetime.now(timezone.utc)
    date_to = now_utc.strftime("%Y-%m-%d")
    date_from = (now_utc - timedelta(days=90)).strftime("%Y-%m-%d")

    params = {
        "ordering": "-added",
        "dates": f"{date_from},{date_to}",
        "metacritic": "75,100",
        "page_size": 25,
        "key": _api_key(),
    }

    try:
        resp = requests.get(f"{_RAWG_BASE}/games", params=params, timeout=15)
    except requests.RequestException as exc:
        logger.error("trending_rawg_request_error err=%s", exc)
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
    Fetch trending games from RAWG and write to DynamoDB.
    On any RAWG failure: log loudly and return without touching DynamoDB,
    so the existing (possibly stale) item keeps serving.
    """
    games = _fetch_rawg_trending()
    if games is None:
        logger.error(
            "trending_refresh_skipped reason=rawg_failure "
            "existing_item_preserved=true"
        )
        return

    now = int(time.time())
    updated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    ttl = now + _TRENDING_TTL_SEC

    put_trending_daily(games=games, updated_at=updated_at, ttl=ttl)
    logger.info("trending_refresh_complete count=%d ttl=%d", len(games), ttl)


def handler(event: dict, context) -> dict:
    stale_days = _env_int("REFRESH_STALE_DAYS", 7)
    failed_retry_days = _env_int("FAILED_RETRY_DAYS", 30)
    max_calls = _env_int("MAX_CALLS_PER_RUN", 200)

    now = int(time.time())
    stale_cutoff = now - stale_days * _DAY
    failed_cutoff = now - failed_retry_days * _DAY
    session_since = now - 30 * _DAY

    # ── a) existing cache items ────────────────────────────────────────────
    cached = iter_all_game_metadata()
    cached_map: dict[str, dict] = {item["game_exe"]: item for item in cached}

    # ── b) new exes from recent sessions ──────────────────────────────────
    recent_exes = iter_recent_session_exes(session_since)
    new_exes = recent_exes - cached_map.keys()

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

    for exe in queue:
        metadata = fetch_metadata(exe)
        put_game_metadata(metadata)
        processed += 1
        if exe in new_exes:
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
