import logging
import os
import time

from shared.db import iter_all_game_metadata, iter_recent_session_exes, put_game_metadata
from shared.rawg import fetch_metadata

logger = logging.getLogger(__name__)

_DAY = 86_400


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


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
    return result
