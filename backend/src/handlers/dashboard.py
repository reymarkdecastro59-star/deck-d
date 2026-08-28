import json
from collections import defaultdict
from shared.auth import get_user_id
from shared.db import get_sessions


def handler(event: dict, context) -> dict:
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

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps({
            "total_sessions": len(sessions),
            "total_hours": round(total_sec / 3600, 2),
            "games": games,
        }),
    }
