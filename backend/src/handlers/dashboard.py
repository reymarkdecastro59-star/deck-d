import json
from collections import defaultdict
from aws_lambda_powertools import Logger
from shared.auth import get_user_id
from shared.cors import CORS_HEADERS
from shared.db import get_sessions

logger = Logger(service="deckd-dashboard")


@logger.inject_lambda_context(correlation_id_path="requestContext.requestId")
def handler(event: dict, context) -> dict:
    try:
        user_id = get_user_id(event)
        sessions = get_sessions(user_id, limit=500)

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

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "total_sessions": total_sessions,
                "total_hours": total_hours,
                "games": games,
            }),
        }
    except Exception:
        logger.exception("Unhandled error in dashboard handler")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": "Internal server error"}),
        }
