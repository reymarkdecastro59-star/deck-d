"""
Recency-weighted playtime scoring via exponential decay.

A session's contribution to a user's "current momentum" score is its
duration multiplied by 2**(-age / HALF_LIFE_SEC). One half-life ago →
half credit; two half-lives ago → quarter credit; and so on.

Since Phase 4 the decay is computed against the union of a game's
intervals — otherwise two overlapping sessions on different devices
would double-count their credit and inflate the momentum score.
"""
from collections import defaultdict

from .intervals import merge_intervals
from .models import Session

HALF_LIFE_DAYS = 14
HALF_LIFE_SEC = HALF_LIFE_DAYS * 86_400


def weight(age_sec: int) -> float:
    if age_sec <= 0:
        return 1.0
    return 2.0 ** (-age_sec / HALF_LIFE_SEC)


def decay_sec(sessions: list[Session], now: int) -> float:
    """Total decay-weighted seconds across all sessions.

    Kept for callers that don't care about per-game grouping — sums the
    per-game union results so double-counting is stripped."""
    return sum(decay_sec_by_game(sessions, now).values(), start=0.0)


def decay_sec_by_game(sessions: list[Session], now: int) -> dict[str, float]:
    """Decay-weighted seconds per game, computed on the union of intervals.

    Each merged interval contributes (length_sec * weight(now - interval_start))
    so overlapping sessions on the same game aren't double-counted."""
    intervals_by_game: dict[str, list[tuple[int, int]]] = defaultdict(list)
    for s in sessions:
        intervals_by_game[s.game_name].append((s.started_at, s.ended_at))

    totals: dict[str, float] = {}
    for game, ivs in intervals_by_game.items():
        merged = merge_intervals(ivs)
        totals[game] = sum(
            (end - start) * weight(now - start) for start, end in merged
        )
    return totals
