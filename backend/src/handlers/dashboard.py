import json
import time
from collections import defaultdict
from aws_lambda_powertools import Logger
from shared.auth import get_user_id
from shared.cors import CORS_HEADERS
from shared.db import get_sessions, get_sessions_in_range

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

        by_game: dict[str, int] = defaultdict(int)
        total_sec = 0
        for s in sessions:
            by_game[s.game_name] += s.duration_sec
            total_sec += s.duration_sec

        games = sorted(
            [{"game": g, "total_sec": t, "total_hours": round(t / 3600, 2)} for g, t in by_game.items()],
            key=lambda x: x["total_sec"],
            reverse=True,
        )

        total_sessions = len(sessions)
        total_hours = round(total_sec / 3600, 2)
        logger.info("dashboard_fetched", total_sessions=total_sessions, total_hours=total_hours)

        body: dict = {
            "total_sessions": total_sessions,
            "total_hours": total_hours,
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
