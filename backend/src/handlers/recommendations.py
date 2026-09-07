import hashlib
import json
import time
from collections import defaultdict
from decimal import Decimal

from aws_lambda_powertools import Logger
from shared.auth import get_user_id
from shared.cors import CORS_HEADERS
from shared.db import (
    batch_get_game_metadata,
    get_recs_genre,
    get_trending_daily,
    iter_all_sessions,
    put_recs_genre,
)
from shared.decay import decay_sec_from_intervals
from shared.rawg import search_games_by_genres

logger = Logger(service="deckd-recommendations")

_CACHE_HEADER = "private, max-age=300"

# Below this count of RAWG-resolved distinct games the genre tier is hidden
# (per PRD Story 2 / Story 4 — matches the "unlock" copy on the frontend).
_GENRE_MIN_RESOLVED_GAMES = 3
# How many top genres feed the RAWG candidate query.
_GENRE_TOP_N = 3
# Max cards returned by the tier — PRD says 10–15.
_GENRE_RESULT_LIMIT = 15
# 24h per-user cache TTL for the genre tier.
_GENRE_CACHE_TTL_SEC = 24 * 3600


class _DecimalEncoder(json.JSONEncoder):
    """Convert Decimal to float for API responses (DynamoDB stores rating as Decimal)."""

    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


@logger.inject_lambda_context(correlation_id_path="requestContext.requestId")
def handler(event: dict, context) -> dict:
    try:
        return _get_recommendations(event)
    except Exception:
        logger.exception("Unhandled error in recommendations handler")
        return _resp(500, {"error": "Internal server error"})


def _get_recommendations(event: dict) -> dict:
    user_id = get_user_id(event)
    hashed = hashlib.sha256(user_id.encode()).hexdigest()[:12]

    trending = _trending()
    genre_based = _genre_based_for(user_id, hashed)

    body = {
        "trending": trending,
        "genre_based": genre_based,
        "top_picks": None,
    }
    logger.info(
        "recommendations_fetched",
        user_id_hash=hashed,
        trending_count=len(trending),
        genre_based_count=(len(genre_based) if genre_based else 0),
    )
    headers = {**CORS_HEADERS, "Cache-Control": _CACHE_HEADER}
    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps(body, cls=_DecimalEncoder),
    }


def _trending() -> list:
    item = get_trending_daily()
    if item is None:
        return []
    return item.get("games", []) or []


def _genre_based_for(user_id: str, user_hash: str) -> list | None:
    """Return the genre-based recommendation list, or None if the tier is hidden.

    None means "don't render this tier" — either the user is below the resolved-
    games threshold or RAWG is currently unreachable. Errors here must never
    propagate: a Tier 2 failure is designed to be silent so Tier 1 still ships.
    """
    cached = get_recs_genre(user_id)
    if cached is not None:
        return cached.get("games", []) or []

    sessions = iter_all_sessions(user_id)
    if not sessions:
        return None

    # Batch-fetch RAWG metadata for every distinct exe the user has ever played.
    exes = sorted({s.game_exe.lower() for s in sessions if s.game_exe})
    metadata_by_exe = batch_get_game_metadata(exes)
    resolved_metas = {
        exe: m
        for exe, m in metadata_by_exe.items()
        if not m.get("resolution_failed", False)
    }
    if len(resolved_metas) < _GENRE_MIN_RESOLVED_GAMES:
        return None

    # Decay-weighted playtime per exe, on the interval union (so overlapping
    # cross-device sessions don't double-count and inflate a genre's weight).
    now = int(time.time())
    intervals_by_exe: dict[str, list[tuple[int, int]]] = defaultdict(list)
    for s in sessions:
        exe = s.game_exe.lower()
        if exe in resolved_metas:
            intervals_by_exe[exe].append((s.started_at, s.ended_at))

    # Distribute each game's decay weight evenly across its genres so a game
    # with 3 genres doesn't triple-vote versus a single-genre game.
    genre_weights: dict[str, float] = defaultdict(float)
    for exe, ivs in intervals_by_exe.items():
        weight = decay_sec_from_intervals(ivs, now)
        if weight <= 0:
            continue
        genres = resolved_metas[exe].get("genres") or []
        if not genres:
            continue
        share = weight / len(genres)
        for g in genres:
            genre_weights[g] += share

    if not genre_weights:
        return None

    top_genres = [
        g for g, _ in sorted(
            genre_weights.items(), key=lambda kv: kv[1], reverse=True
        )[:_GENRE_TOP_N]
    ]

    candidates = search_games_by_genres(top_genres)
    if candidates is None:
        logger.warning("genre_tier_rawg_failure", user_id_hash=user_hash)
        return None

    # Drop games the user has already played, matched by rawg_id — the most
    # reliable identifier we have across launchers.
    played_rawg_ids = {
        m.get("rawg_id") for m in resolved_metas.values() if m.get("rawg_id") is not None
    }
    filtered = [g for g in candidates if g.get("rawg_id") not in played_rawg_ids]

    result = filtered[:_GENRE_RESULT_LIMIT]
    put_recs_genre(user_id, result, ttl=now + _GENRE_CACHE_TTL_SEC)
    return result


def _resp(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": CORS_HEADERS,
        "body": json.dumps(body),
    }
