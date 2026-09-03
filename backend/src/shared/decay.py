"""
Recency-weighted playtime scoring via exponential decay.

A session's contribution to a user's "current momentum" score is its
duration multiplied by 2**(-age / HALF_LIFE_SEC). One half-life ago →
half credit; two half-lives ago → quarter credit; and so on.
"""
from .models import Session

HALF_LIFE_DAYS = 14
HALF_LIFE_SEC = HALF_LIFE_DAYS * 86_400


def weight(age_sec: int) -> float:
    if age_sec <= 0:
        return 1.0
    return 2.0 ** (-age_sec / HALF_LIFE_SEC)


def decay_sec(sessions: list[Session], now: int) -> float:
    return sum(s.duration_sec * weight(now - s.started_at) for s in sessions)


def decay_sec_by_game(sessions: list[Session], now: int) -> dict[str, float]:
    totals: dict[str, float] = {}
    for s in sessions:
        totals[s.game_name] = totals.get(s.game_name, 0.0) + s.duration_sec * weight(now - s.started_at)
    return totals
