"""
Canonical game grouping for dashboard aggregation (Phase 7).

Two rows for "the same game" installed via different launchers (Steam
vs Epic) end up with different exe names (`phasmo.exe` vs
`phasmophobia.exe`) and often different display names. The naive
`group_by(game_name)` in dashboard.py counts them separately, which
fixes conflict C4 from the multi-device audit.

This module provides `canonical_key(session, metadata_by_exe)` that
picks the strongest grouping key available:

    1. RAWG `rawg_id` — authoritative when the metadata cache resolved
       both exes to the same game.
    2. Lowercased `game_exe` — same install always ties together.
    3. `game_name` — last resort when the cache hasn't caught up.

`build_display` returns the presentation blob a response row should
include (canonical name, slug, background image) so the frontend can
render a game tile without a second lookup.
"""
from __future__ import annotations

from typing import Any, Optional

from .models import Session


def _exe_lower(session: Session) -> str:
    return (session.game_exe or "").lower()


def canonical_key(session: Session, metadata_by_exe: dict[str, dict]) -> str:
    """Return the grouping key for a session. Never returns empty string."""
    meta = metadata_by_exe.get(_exe_lower(session))
    if meta and not meta.get("resolution_failed") and meta.get("rawg_id"):
        return f"rawg:{meta['rawg_id']}"
    exe = _exe_lower(session)
    if exe:
        return f"exe:{exe}"
    return f"name:{session.game_name}"


def build_display(
    key: str,
    sessions: list[Session],
    metadata_by_exe: dict[str, dict],
) -> dict[str, Any]:
    """Build the display block for a canonical group.

    Prefer the RAWG cache's `name`/`slug`/`background_image` when we
    resolved via rawg_id. Otherwise fall back to whatever the sessions
    already carry — the most common `game_name` wins (mode of the group).
    """
    if key.startswith("rawg:"):
        # Find any session's metadata for this key (they'll all share it)
        for s in sessions:
            meta = metadata_by_exe.get(_exe_lower(s))
            if meta and not meta.get("resolution_failed") and meta.get("rawg_id"):
                return {
                    "game": meta.get("name") or _mode_name(sessions),
                    "rawg_id": int(meta["rawg_id"]),
                    "slug": meta.get("slug"),
                    "background_image": meta.get("background_image"),
                }
    return {
        "game": _mode_name(sessions),
        "rawg_id": None,
        "slug": None,
        "background_image": None,
    }


def _mode_name(sessions: list[Session]) -> str:
    """Return the most-common game_name across sessions in a group.

    When the exe-fallback groups multiple sessions the users named
    differently, we don't want to pick arbitrarily — the mode is stable
    and matches the user's most-frequent choice."""
    counts: dict[str, int] = {}
    for s in sessions:
        counts[s.game_name] = counts.get(s.game_name, 0) + 1
    return max(counts.items(), key=lambda kv: (kv[1], kv[0]))[0]


def unique_exes(sessions: list[Session]) -> list[str]:
    """Lowercased distinct game_exe values — the batch_get_item input set."""
    seen: set[str] = set()
    for s in sessions:
        exe = _exe_lower(s)
        if exe:
            seen.add(exe)
    return sorted(seen)
