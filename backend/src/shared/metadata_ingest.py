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
        for cid in missing[:MAX_LOOKUPS_PER_REQUEST]:
            exe, title = wanted[cid]
            put_game_metadata(with_cache_id(fetch_metadata(exe, title), exe, title))
        return len(missing[:MAX_LOOKUPS_PER_REQUEST])
    except Exception:  # noqa: BLE001 — never break session ingest
        logger.exception("ensure_metadata_failed")
        return 0
