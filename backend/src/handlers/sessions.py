import json
from shared.auth import get_user_id, get_user_email
from shared.cors import CORS_HEADERS
from shared.db import put_session, get_sessions, get_or_create_profile, delete_session, update_session_label
from shared.models import Session


def handler(event: dict, context) -> dict:
    method = event["httpMethod"]
    path_params = event.get("pathParameters") or {}
    session_id = path_params.get("session_id")

    if method == "POST":
        return _post_session(event)
    if method == "GET":
        return _get_sessions(event)
    if method == "DELETE" and session_id:
        return _delete_session(event, session_id)
    if method == "PATCH" and session_id:
        return _patch_session(event, session_id)
    return _resp(405, {"error": "Method not allowed"})


def _post_session(event: dict) -> dict:
    user_id = get_user_id(event)
    get_or_create_profile(user_id, get_user_email(event))

    body = json.loads(event.get("body") or "{}")
    required = ["session_id", "game_exe", "game_name", "started_at", "ended_at", "duration_sec"]
    missing = [f for f in required if f not in body]
    if missing:
        return _resp(400, {"error": f"Missing fields: {missing}"})

    session = Session(
        user_id=user_id,
        session_id=body["session_id"],
        game_exe=body["game_exe"],
        game_name=body["game_name"],
        started_at=int(body["started_at"]),
        ended_at=int(body["ended_at"]),
        duration_sec=int(body["duration_sec"]),
        label=body.get("label", "tracked"),
    )
    put_session(session)
    return _resp(201, {"session_id": session.session_id})


def _get_sessions(event: dict) -> dict:
    user_id = get_user_id(event)
    params = event.get("queryStringParameters") or {}
    limit = min(int(params.get("limit", 100)), 500)
    sessions = get_sessions(user_id, limit=limit)
    return _resp(200, {"sessions": [s.to_item() for s in sessions]})


def _delete_session(event: dict, session_id: str) -> dict:
    user_id = get_user_id(event)
    deleted = delete_session(user_id, session_id)
    if not deleted:
        return _resp(404, {"error": "Session not found"})
    return _resp(204, {})


def _patch_session(event: dict, session_id: str) -> dict:
    user_id = get_user_id(event)
    body = json.loads(event.get("body") or "{}")
    label = body.get("label")
    if label is None:
        return _resp(400, {"error": "Missing field: label"})
    session = update_session_label(user_id, session_id, label)
    if session is None:
        return _resp(404, {"error": "Session not found"})
    return _resp(200, {"session": session.to_item()})


def _resp(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": CORS_HEADERS,
        "body": json.dumps(body),
    }
