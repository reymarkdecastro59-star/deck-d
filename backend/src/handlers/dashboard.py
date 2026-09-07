import json
import time
from collections import defaultdict
from aws_lambda_powertools import Logger
from shared.auth import get_user_id
from shared.canonical import build_display, canonical_key, unique_exes
from shared.cors import CORS_HEADERS
from shared.db import batch_get_game_metadata, get_sessions, get_sessions_in_range
from shared.decay import HALF_LIFE_DAYS, decay_sec_from_intervals
from shared.intervals import union_seconds

logger = Logger(service="deckd-dashboard")


@logger.inject_lambda_context(correlation_id_path="requestContext.requestId")
def handler(event: dict, context) -> dict:
    try:
        user_id = get_user_id(event)

        qsp = event.get("queryStringParameters") or {}
        raw_from = qsp.get("from")
        raw_to = qsp.get("to")

        range_meta = None

        if raw_from is None and raw_to is None:
            # Backward-compatible: no range params → all-time query
            sessions = get_sessions(user_id, limit=500)
        else:
            # At least one range param supplied — parse both
            try:
                from_ts = int(raw_from) if raw_from is not None else 0
                to_ts = int(raw_to) if raw_to is not None else int(time.time())
            except (ValueError, TypeError):
                return {
                    "statusCode": 400,
                    "headers": CORS_HEADERS,
                    "body": json.dumps({
                        "error": "invalid_range",
                        "details": "'from' and 'to' must be integer epoch seconds",
                    }),
                }

            if from_ts > to_ts:
                return {
                    "statusCode": 400,
                    "headers": CORS_HEADERS,
                    "body": json.dumps({
                        "error": "invalid_range",
                        "details": f"'from' ({from_ts}) must be <= 'to' ({to_ts})",
                    }),
                }

            sessions = get_sessions_in_range(user_id, from_ts, to_ts, limit=500)
            range_meta = {"from": from_ts, "to": to_ts}

        now = int(time.time())
        # Phase 7: bulk-fetch RAWG metadata so two rows for the same game
        # installed via different launchers (Steam vs Epic) merge into one
        # dashboard row via their shared rawg_id. Falls back to exe then
        # game_name when the cache hasn't caught up.
        metadata_by_exe = batch_get_game_metadata(unique_exes(sessions))

        # Group sessions per canonical key and collect intervals for union math.
        # raw_sum_by_key preserves the naive additive total so the UI can
        # surface "you saved X hours of double-counting" per group.
        raw_sum_by_key: dict[str, int] = defaultdict(int)
        intervals_by_key: dict[str, list[tuple[int, int]]] = defaultdict(list)
        sessions_by_key: dict[str, list] = defaultdict(list)
        all_intervals: list[tuple[int, int]] = []
        raw_sum_sec = 0
        future_dated = 0
        for s in sessions:
            key = canonical_key(s, metadata_by_exe)
            raw_sum_by_key[key] += s.duration_sec
            intervals_by_key[key].append((s.started_at, s.ended_at))
            sessions_by_key[key].append(s)
            all_intervals.append((s.started_at, s.ended_at))
            raw_sum_sec += s.duration_sec
            # Clock skew or bad ingestion payload can produce started_at > now.
            # weight() clamps to 1.0, which violates decay_sec <= total_sec silently
            # in the response — surface it as a warning so ops sees it.
            if now - s.started_at < -60:
                future_dated += 1

        # Union of intervals per canonical group strips wall-clock overlap
        # (same game on two devices at once → counted once, Phase 4).
        union_by_key: dict[str, int] = {
            k: union_seconds(ivs) for k, ivs in intervals_by_key.items()
        }
        decay_by_key: dict[str, float] = {
            k: decay_sec_from_intervals(ivs, now) for k, ivs in intervals_by_key.items()
        }
        total_decay_sec = sum(decay_by_key.values())
        # Top-level union covers cross-game concurrency too (e.g. Game A on
        # PC1 while Game B runs on PC2). Answers "wall-clock hours actually
        # gaming" — the honest number.
        #
        # NOTE: decay_hours (sum of per-game decay credit) can exceed
        # total_hours (cross-game union) when two different games ran
        # concurrently. Per-game the invariant decay_sec <= total_sec always
        # holds, but at the top level decay measures "momentum per game" and
        # total_hours measures "wall time gaming" — different dimensions.
        total_union_sec = union_seconds(all_intervals)

        if future_dated:
            logger.warning("future_dated_sessions", count=future_dated)

        # Sort on the raw float, not the rounded field — rounding then sorting
        # produces arbitrary tie-breaks by dict insertion order.
        sorted_keys = sorted(raw_sum_by_key.keys(), key=lambda k: decay_by_key[k], reverse=True)
        games = []
        for key in sorted_keys:
            display = build_display(key, sessions_by_key[key], metadata_by_exe)
            games.append({
                **display,  # game, rawg_id, slug, background_image
                # total_sec is the union total across the canonical group.
                "total_sec": union_by_key[key],
                "total_hours": round(union_by_key[key] / 3600, 2),
                "raw_sum_sec": raw_sum_by_key[key],
                "overlap_stripped_sec": raw_sum_by_key[key] - union_by_key[key],
                "decay_sec": round(decay_by_key[key], 2),
                "decay_hours": round(decay_by_key[key] / 3600, 2),
            })

        total_sessions = len(sessions)
        total_hours = round(total_union_sec / 3600, 2)
        raw_sum_hours = round(raw_sum_sec / 3600, 2)
        overlap_stripped_hours = round((raw_sum_sec - total_union_sec) / 3600, 2)
        decay_hours = round(total_decay_sec / 3600, 2)
        logger.info(
            "dashboard_fetched",
            total_sessions=total_sessions,
            total_hours=total_hours,
            raw_sum_hours=raw_sum_hours,
            overlap_stripped_hours=overlap_stripped_hours,
            decay_hours=decay_hours,
        )

        body: dict = {
            "total_sessions": total_sessions,
            "total_hours": total_hours,
            "raw_sum_hours": raw_sum_hours,
            "overlap_stripped_hours": overlap_stripped_hours,
            "decay_hours": decay_hours,
            "half_life_days": HALF_LIFE_DAYS,
            "games": games,
        }
        if range_meta is not None:
            body["range"] = range_meta

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps(body),
        }
    except Exception:
        logger.exception("Unhandled error in dashboard handler")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": "Internal server error"}),
        }
