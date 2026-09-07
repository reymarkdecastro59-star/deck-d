import hashlib
import json
import time
from collections import defaultdict
from decimal import Decimal
from typing import Optional

from aws_lambda_powertools import Logger
from shared.auth import get_user_id
from shared.bedrock import (
    BedrockBadResponseError,
    BedrockError,
    invoke_haiku,
)
from shared.cors import CORS_HEADERS
from shared.db import (
    batch_get_game_metadata,
    get_recs_genre,
    get_recs_llm,
    get_trending_daily,
    iter_all_sessions,
    put_recs_genre,
    put_recs_llm,
)
from shared.decay import decay_sec_from_intervals
from shared.rawg import search_game_by_name, search_games_by_genres

logger = Logger(service="deckd-recommendations")

_CACHE_HEADER = "private, max-age=300"

# -- Tier 2 (genre-based) --------------------------------------------------------
_GENRE_MIN_RESOLVED_GAMES = 3
_GENRE_TOP_N = 3
_GENRE_RESULT_LIMIT = 15
_GENRE_CACHE_TTL_SEC = 24 * 3600

# -- Tier 3 (LLM top picks) ------------------------------------------------------
_LLM_MIN_RESOLVED_GAMES = 5
_LLM_TOP_HISTORY = 10
_LLM_MAX_PICKS = 2
_LLM_CACHE_TTL_SEC = 24 * 3600
_LLM_MAX_TOKENS = 400
_LLM_RECENT_FOCUS_WINDOW_SEC = 7 * 86400

_LLM_SYSTEM_PROMPT = (
    "You are a game recommendation engine for a habit-tracking app. Given a "
    "user's play history, suggest exactly 2 well-reviewed games they have not "
    "played. Prefer non-obvious cross-genre picks over same-genre clones. "
    "Respond with a JSON array of exactly 2 objects, each with keys `name` "
    "(string) and `reason` (string ≤ 200 chars). No prose outside the "
    "JSON. No markdown fences."
)


class _DecimalEncoder(json.JSONEncoder):
    """Convert Decimal to float for API responses (DynamoDB stores rating as Decimal)."""

    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


@logger.inject_lambda_context(correlation_id_path="requestContext.requestId")
def handler(event: dict, context) -> dict:
    try:
        return _get_recommendations(event, context)
    except Exception:
        logger.exception("Unhandled error in recommendations handler")
        return _resp(500, {"error": "Internal server error"})


def _get_recommendations(event: dict, context) -> dict:
    user_id = get_user_id(event)
    hashed = hashlib.sha256(user_id.encode()).hexdigest()[:12]

    trending = _trending()
    genre_based = _genre_based_for(user_id, hashed)
    top_picks = _top_picks_for(user_id, hashed, context, genre_based)

    body = {
        "trending": trending,
        "genre_based": genre_based,
        "top_picks": top_picks,
    }
    logger.info(
        "recommendations_fetched",
        user_id_hash=hashed,
        trending_count=len(trending),
        genre_based_count=(len(genre_based) if genre_based else 0),
        top_picks_count=(len(top_picks) if top_picks else 0),
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


# ---------------------------------------------------------------------------
# Tier 2 — genre-based
# ---------------------------------------------------------------------------

def _genre_based_for(user_id: str, user_hash: str) -> Optional[list]:
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

    exes = sorted({s.game_exe.lower() for s in sessions if s.game_exe})
    metadata_by_exe = batch_get_game_metadata(exes)
    resolved_metas = {
        exe: m
        for exe, m in metadata_by_exe.items()
        if not m.get("resolution_failed", False)
    }
    if len(resolved_metas) < _GENRE_MIN_RESOLVED_GAMES:
        return None

    now = int(time.time())
    intervals_by_exe: dict[str, list[tuple[int, int]]] = defaultdict(list)
    for s in sessions:
        exe = s.game_exe.lower()
        if exe in resolved_metas:
            intervals_by_exe[exe].append((s.started_at, s.ended_at))

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

    played_rawg_ids = {
        m.get("rawg_id") for m in resolved_metas.values() if m.get("rawg_id") is not None
    }
    filtered = [g for g in candidates if g.get("rawg_id") not in played_rawg_ids]

    result = filtered[:_GENRE_RESULT_LIMIT]
    put_recs_genre(user_id, result, ttl=now + _GENRE_CACHE_TTL_SEC)
    return result


# ---------------------------------------------------------------------------
# Tier 3 — LLM top picks
# ---------------------------------------------------------------------------

def _top_picks_for(
    user_id: str,
    user_hash: str,
    context,
    genre_fallback: Optional[list],
) -> Optional[list]:
    """Return the 2-item LLM-curated top-picks list, or None to hide the tier.

    Failure policy (spec §Failure modes): any exception past the threshold
    check degrades to cached-stale-if-present, else None. A Bedrock outage
    must never surface as a 500 to the client.

    `genre_fallback` is Tier 2's result — used when both LLM picks fail
    post-validation so we can still deliver 2 cards.
    """
    sessions = iter_all_sessions(user_id)
    if not sessions:
        return None

    exes = sorted({s.game_exe.lower() for s in sessions if s.game_exe})
    metadata_by_exe = batch_get_game_metadata(exes)
    resolved_metas = {
        exe: m
        for exe, m in metadata_by_exe.items()
        if not m.get("resolution_failed", False)
    }
    if len(resolved_metas) < _LLM_MIN_RESOLVED_GAMES:
        return None

    cached_item = get_recs_llm(user_id)
    now = int(time.time())
    if cached_item is not None:
        ttl = int(cached_item.get("ttl", 0))
        if ttl > now:
            return cached_item.get("picks") or None

    # Cache miss or stale — attempt a fresh generation. Any failure below
    # falls through to the stale-served or hide-tier path.
    try:
        played_rawg_ids = {
            m.get("rawg_id") for m in resolved_metas.values()
            if m.get("rawg_id") is not None
        }
        user_prompt = _build_llm_user_prompt(sessions, resolved_metas, now)
        response = invoke_haiku(context, _LLM_SYSTEM_PROMPT, user_prompt, _LLM_MAX_TOKENS)

        raw_text = response.get("text", "")
        usage = response.get("usage", {})
        logger.info(
            "bedrock_invoked",
            user_id_hash=user_hash,
            input_tokens=usage.get("input_tokens"),
            output_tokens=usage.get("output_tokens"),
            cache_state=("miss" if cached_item is None else "stale"),
        )

        suggestions = _parse_llm_json(raw_text)
        if suggestions is None:
            # Don't log the raw text — if the model ever echoes prompt
            # fragments (game names from user's DDB history), we'd persist
            # untrusted third-party content to CloudWatch. Length + short
            # fingerprint is enough to grep for and diagnose.
            fingerprint = raw_text[:40].replace("\n", " ")
            logger.warning(
                "llm_bad_json",
                user_id_hash=user_hash,
                text_len=len(raw_text),
                text_fingerprint=fingerprint,
            )
            return _serve_stale_or_none(cached_item)

        validated = _validate_llm_suggestions(suggestions, played_rawg_ids)
        logger.info(
            "llm_validation_result",
            user_id_hash=user_hash,
            validation_survivors=len(validated),
        )

        if not validated:
            # Zero survivors — fall through to Phase 8b promotion.
            promoted = _promote_from_genre(genre_fallback)
            if promoted is None:
                return _serve_stale_or_none(cached_item)
            put_recs_llm(user_id, promoted, generated_at=now, ttl=now + _LLM_CACHE_TTL_SEC)
            return promoted

        put_recs_llm(user_id, validated, generated_at=now, ttl=now + _LLM_CACHE_TTL_SEC)
        return validated
    except BedrockError as exc:
        logger.warning(
            "bedrock_call_failed",
            user_id_hash=user_hash,
            err=type(exc).__name__,
            err_msg=str(exc)[:200],
        )
        return _serve_stale_or_none(cached_item)
    except Exception as exc:
        # Catch-all: Bedrock ClientError (Throttling, AccessDenied), network,
        # anything else. All degrade identically — the tier hides or serves
        # stale, but never 500s the whole endpoint.
        logger.warning(
            "top_picks_unexpected_error",
            user_id_hash=user_hash,
            err=type(exc).__name__,
            err_msg=str(exc)[:200],
        )
        return _serve_stale_or_none(cached_item)


def _serve_stale_or_none(cached_item: Optional[dict]) -> Optional[list]:
    if cached_item is None:
        return None
    return cached_item.get("picks") or None


def _promote_from_genre(genre_fallback: Optional[list]) -> Optional[list]:
    """Promote the top 2 genre picks into a Tier 3-shaped fallback."""
    if not genre_fallback:
        return None
    promoted: list[dict] = []
    for g in genre_fallback[:_LLM_MAX_PICKS]:
        promoted.append({
            "rawg_id": g.get("rawg_id"),
            "name": g.get("name"),
            "slug": g.get("slug"),
            "background_image": g.get("background_image"),
            "genres": g.get("genres") or [],
            "metacritic": g.get("metacritic"),
            "reason": "Well-reviewed in genres you play often",
        })
    return promoted or None


def _build_llm_user_prompt(
    sessions: list, resolved_metas: dict[str, dict], now: int,
) -> str:
    """Compose the user-message body from the user's history + metadata."""
    intervals_by_exe: dict[str, list[tuple[int, int]]] = defaultdict(list)
    total_sec_by_exe: dict[str, int] = defaultdict(int)
    latest_start_by_exe: dict[str, int] = {}
    for s in sessions:
        exe = s.game_exe.lower()
        if exe not in resolved_metas:
            continue
        intervals_by_exe[exe].append((s.started_at, s.ended_at))
        total_sec_by_exe[exe] += max(0, s.ended_at - s.started_at)
        if s.started_at > latest_start_by_exe.get(exe, 0):
            latest_start_by_exe[exe] = s.started_at

    scored: list[tuple[str, float, int]] = []
    for exe, ivs in intervals_by_exe.items():
        decay = decay_sec_from_intervals(ivs, now)
        scored.append((exe, decay, total_sec_by_exe[exe]))
    scored.sort(key=lambda t: t[1], reverse=True)

    top_lines: list[str] = []
    genre_totals: dict[str, float] = defaultdict(float)
    for exe, decay, total in scored[:_LLM_TOP_HISTORY]:
        meta = resolved_metas[exe]
        name = meta.get("name") or exe
        genres = meta.get("genres") or []
        total_h = round(total / 3600.0, 1)
        recent_h = round(decay / 3600.0, 1)
        top_lines.append(
            f"- {name} — {total_h}h total, {recent_h}h recent, "
            f"genres: {', '.join(genres) if genres else 'unknown'}"
        )
        for g in genres:
            genre_totals[g] += decay

    top_genres = [
        g for g, _ in sorted(genre_totals.items(), key=lambda kv: kv[1], reverse=True)[:3]
    ]

    recent_cutoff = now - _LLM_RECENT_FOCUS_WINDOW_SEC
    recent_focus = "none"
    for exe, decay, _total in scored:
        if latest_start_by_exe.get(exe, 0) >= recent_cutoff:
            recent_focus = resolved_metas[exe].get("name") or exe
            break

    top_game_genres = ", ".join((resolved_metas[scored[0][0]].get("genres") or [])) if scored else ""
    top_game_name = (resolved_metas[scored[0][0]].get("name") if scored else "") or "(none)"

    return (
        "Top 10 by recency-weighted playtime:\n"
        + "\n".join(top_lines) + "\n\n"
        f"Recent focus (last 7 days): {recent_focus}\n"
        f"Dominant genres: {', '.join(top_genres) if top_genres else 'unknown'}\n\n"
        f"Avoid suggesting same-genre clones of the top game "
        f"({top_game_name}{' is ' + top_game_genres if top_game_genres else ''}).\n"
        "Suggest 2 games matching the JSON schema in the system message."
    )


def _parse_llm_json(text: str) -> Optional[list[dict]]:
    """Parse the LLM's JSON output, tolerant of a leading/trailing fenced block."""
    if not text:
        return None
    stripped = text.strip()
    # Defensive: strip markdown fences if the model added them anyway.
    if stripped.startswith("```"):
        first_newline = stripped.find("\n")
        if first_newline != -1:
            stripped = stripped[first_newline + 1:]
        if stripped.endswith("```"):
            stripped = stripped[:-3]
        stripped = stripped.strip()
    try:
        parsed = json.loads(stripped)
    except json.JSONDecodeError:
        return None
    if not isinstance(parsed, list):
        return None
    out: list[dict] = []
    for item in parsed:
        if not isinstance(item, dict):
            continue
        name = item.get("name")
        reason = item.get("reason", "")
        if not name or not isinstance(name, str):
            continue
        out.append({"name": name.strip(), "reason": str(reason)[:200]})
    return out


def _validate_llm_suggestions(
    suggestions: list[dict], played_rawg_ids: set,
) -> list[dict]:
    """RAWG-verify each LLM suggestion; drop those that don't clear the bar."""
    validated: list[dict] = []
    for sug in suggestions[:_LLM_MAX_PICKS]:
        rawg_hit = search_game_by_name(sug["name"])
        if rawg_hit is None:
            continue
        metacritic = rawg_hit.get("metacritic")
        if metacritic is None:
            continue
        try:
            score = int(metacritic)
        except (TypeError, ValueError):
            # RAWG has been observed returning non-numeric metacritic values
            # for some titles — reject rather than raise (the outer envelope
            # would catch it, but this makes the rejection explicit).
            continue
        if score < 75:
            continue
        if rawg_hit.get("rawg_id") in played_rawg_ids:
            continue
        validated.append({
            "rawg_id": rawg_hit["rawg_id"],
            "name": rawg_hit["name"],
            "slug": rawg_hit.get("slug"),
            "background_image": rawg_hit.get("background_image"),
            "genres": rawg_hit.get("genres") or [],
            "metacritic": metacritic,
            "reason": sug["reason"],
        })
    return validated


def _resp(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": CORS_HEADERS,
        "body": json.dumps(body),
    }
