"""Resolve game art as soon as a new game's first session arrives.

The daily refresh job used to be the only path, so a newly played game had
no cover until 03:00 UTC the next day. Here the session upload looks up the
few exes the cache has never seen. Best effort: capped per request, every
error swallowed — an upload must never fail because RAWG is slow or down.
"""
from __future__ import annotations

import logging

from .db import batch_get_game_metadata, put_game_metadata
from .rawg import fetch_metadata

logger = logging.getLogger(__name__)

MAX_LOOKUPS_PER_REQUEST = 3


def ensure_metadata(sessions) -> int:
    """Look up unseen exes (by the title the tracker reported). Returns lookups made."""
    try:
        wanted: dict[str, str] = {}
        for s in sessions:
            exe = (s.game_exe or "").lower()
            if exe and exe not in wanted:
                wanted[exe] = s.game_name or ""
        if not wanted:
            return 0
        known = batch_get_game_metadata(list(wanted))
        missing = [exe for exe in wanted if exe not in known][:MAX_LOOKUPS_PER_REQUEST]
        for exe in missing:
            put_game_metadata(fetch_metadata(exe, wanted[exe]))
        return len(missing)
    except Exception:  # noqa: BLE001 — never break session ingest
        logger.exception("ensure_metadata_failed")
        return 0
