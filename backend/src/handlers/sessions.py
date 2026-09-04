import json
from aws_lambda_powertools import Logger
from pydantic import ValidationError
from shared.auth import get_user_id, get_user_email
from shared.cors import CORS_HEADERS
from shared.db import put_session, put_sessions_batch, get_sessions, get_or_create_profile, delete_session, update_session_label
from shared.models import Session
from shared.schemas import SessionCreate, SessionBatchCreate, SessionPatch

logger = Logger(service="deckd-sessions")


@logger.inject_lambda_context(correlation_id_path="requestContext.requestId")
def handler(event: dict, context) -> dict:
    try:
        method = event["httpMethod"]
        path_params = event.get("pathParameters") or {}
        session_id = path_params.get("session_id")

        if method == "POST":
            resource = event.get("resource") or ""
            if resource.endswith("/batch"):
                return _post_batch(event)
            return _post_session(event)
        if method == "GET":
            return _get_sessions(event)
        if method == "DELETE" and session_id:
            return _delete_session(event, session_id)
        if method == "PATCH" and session_id:
            return _patch_session(event, session_id)
        return _resp(405, {"error": "Method not allowed"})
    except Exception:
        logger.exception("Unhandled error in sessions handler")
        return _resp(500, {"error": "Internal server error"})


def _post_session(event: dict) -> dict:
    user_id = get_user_id(event)
    get_or_create_profile(user_id, get_user_email(event))

    try:
        data = SessionCreate.model_validate(json.loads(event.get("body") or "{}"))
    except ValidationError as e:
        return _resp(400, {"error": "validation_failed", "details": e.errors(include_context=False, include_input=False, include_url=False)})

    session = Session(
        user_id=user_id,
        session_id=data.session_id,
        game_exe=data.game_exe,
        game_name=data.game_name,
        started_at=data.started_at,
        ended_at=data.ended_at,
        duration_sec=data.duration_sec,
        label=data.label,
    )
    put_session(session)
    logger.info("session_created", session_id=session.session_id, game_name=session.game_name, duration_sec=session.duration_sec)
    return _resp(201, {"session_id": session.session_id})


def _post_batch(event: dict) -> dict:
    user_id = get_user_id(event)
    get_or_create_profile(user_id, get_user_email(event))

    try:
        raw = json.loads(event.get("body") or "null")
    except (json.JSONDecodeError, ValueError):
        return _resp(400, {"error": "invalid_json"})

    if raw is None:
        return _resp(400, {"error": "invalid_json"})

    try:
        data = SessionBatchCreate.model_validate(raw)
    except ValidationError as e:
        return _resp(400, {"error": "validation_failed", "details": e.errors(include_context=False, include_input=False, include_url=False)})

    sessions = [
        Session(
            user_id=user_id,
            session_id=item.session_id,
            game_exe=item.game_exe,
            game_name=item.game_name,
            started_at=item.started_at,
            ended_at=item.ended_at,
            duration_sec=item.duration_sec,
            label=item.label,
        )
        for item in data.sessions
    ]
    put_sessions_batch(sessions)
    logger.info("sessions_batch_created", user_id=user_id, count=len(sessions))
    return _resp(201, {"count": len(sessions), "session_ids": [s.session_id for s in sessions]})


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
        logger.warning("session_not_found_for_delete", session_id=session_id)
        return _resp(404, {"error": "Session not found"})
    logger.info("session_deleted", session_id=session_id)
    return _resp(204, {})


def _patch_session(event: dict, session_id: str) -> dict:
    user_id = get_user_id(event)

    try:
        data = SessionPatch.model_validate(json.loads(event.get("body") or "{}"))
    except ValidationError as e:
        return _resp(400, {"error": "validation_failed", "details": e.errors(include_context=False, include_input=False, include_url=False)})

    session = update_session_label(user_id, session_id, data.label)
    if session is None:
        logger.warning("session_not_found_for_patch", session_id=session_id)
        return _resp(404, {"error": "Session not found"})
    logger.info("session_label_updated", session_id=session_id, new_label=data.label)
    return _resp(200, {"session": session.to_item()})


def _resp(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": CORS_HEADERS,
        "body": json.dumps(body),
    }
