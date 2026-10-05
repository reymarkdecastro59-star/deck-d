"""Resolve game art as soon as a new game's first session arrives.

The daily refresh job used to be the only path, so a newly played game had
no cover until 03:00 UTC the next day. Here the session upload looks up the
few exes the cache has never seen. Best effort: capped per request, every
error swallowed — an upload must never fail because RAWG is slow or down.
"""
from __future__ import annotations

import logging

from .db import batch_get_game_metadata, put_game_metadata
from .canonical import cache_id, with_cache_id
from .rawg import fetch_metadata

logger = logging.getLogger(__name__)

MAX_LOOKUPS_PER_REQUEST = 3
# Per user per UTC day: the per-request cap alone can be multiplied by
# sending many requests, which would burn the shared RAWG quota.
MAX_LOOKUPS_PER_USER_PER_DAY = 30


def _take_budget(user_id: str) -> bool:
    """Reserve one lookup from today's budget. False when it's spent."""
    import time
    from botocore.exceptions import ClientError
    from .db import get_table

    day = time.strftime("%Y%m%d", time.gmtime())
    try:
        get_table().update_item(
            Key={"pk": f"USER#{user_id}", "sk": f"LOOKUPBUDGET#{day}"},
            UpdateExpression="ADD used :one SET #ttl = :ttl",
            ConditionExpression="attribute_not_exists(used) OR used < :max",
            ExpressionAttributeNames={"#ttl": "ttl"},
            ExpressionAttributeValues={":one": 1, ":max": MAX_LOOKUPS_PER_USER_PER_DAY,
                                       ":ttl": int(time.time()) + 2 * 86_400},
        )
        return True
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
            return False
        raise


def ensure_metadata(sessions) -> int:
    """Look up unseen exes (by the title the tracker reported). Returns lookups made."""
    try:
        wanted: dict[str, tuple[str, str]] = {}  # cache id -> (exe, title)
        for s in sessions:
            exe = (s.game_exe or "").lower()
            if exe:
                wanted.setdefault(cache_id(exe, s.game_name), (exe, s.game_name or ""))
        if not wanted:
            return 0
        known = batch_get_game_metadata(sorted(set(wanted) | {exe for exe, _ in wanted.values()}))

        def covered(cid: str, exe: str) -> bool:
            if cid in known:
                return True
            legacy = known.get(exe)  # a resolved exe-only entry serves every title
            return bool(legacy and not legacy.get("resolution_failed")
                        and not legacy.get("resolved_from_title"))

        missing = [cid for cid, (exe, _) in wanted.items() if not covered(cid, exe)]
        user_id = getattr(sessions[0], "user_id", None) if sessions else None
        done = 0
        for cid in missing[:MAX_LOOKUPS_PER_REQUEST]:
            if user_id and not _take_budget(user_id):
                break  # the daily job will pick these up
            exe, title = wanted[cid]
            put_game_metadata(with_cache_id(fetch_metadata(exe, title), exe, title))
            done += 1
        return done
    except Exception:  # noqa: BLE001 — never break session ingest
        logger.exception("ensure_metadata_failed")
        return 0
