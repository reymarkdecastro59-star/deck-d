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


def _loose(text: Optional[str]) -> str:
    return "".join(ch for ch in (text or "").lower() if ch.isalnum())


def meta_applies(meta: Optional[dict], game_name: Optional[str]) -> bool:
    """Whether a shared metadata cache entry may be used for this session.

    Entries resolved from a client-reported title (`resolved_from_title`)
    only apply to sessions reporting that same title (or RAWG's name for
    it). Exe-only entries apply as before.
    """
    if not meta or meta.get("resolution_failed") or not meta.get("rawg_id"):
        return False
    title_key = meta.get("resolved_from_title")
    if not title_key:
        return True
    mine = _loose(game_name)
    return bool(mine) and mine in (title_key, _loose(meta.get("name")))


def canonical_key(session: Session, metadata_by_exe: dict[str, dict]) -> str:
    """Return the grouping key for a session. Never returns empty string."""
    meta = metadata_by_exe.get(_exe_lower(session))
    if meta_applies(meta, session.game_name):
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
            if meta_applies(meta, s.game_name):
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
