import json
from shared.auth import get_user_id
from shared.cors import CORS_HEADERS
from shared.db import get_profile, update_profile


def handler(event: dict, context) -> dict:
    method = event["httpMethod"]
    if method == "GET":
        return _get_profile(event)
    if method == "PATCH":
        return _patch_profile(event)
    return _resp(405, {"error": "Method not allowed"})


def _get_profile(event: dict) -> dict:
    user_id = get_user_id(event)
    profile = get_profile(user_id)
    if profile is None:
        return _resp(404, {"error": "Profile not found"})
    return _resp(200, {"profile": profile.to_item()})


def _patch_profile(event: dict) -> dict:
    user_id = get_user_id(event)
    body = json.loads(event.get("body") or "{}")
    editable = {k: v for k, v in body.items() if k in {"email"}}
    profile = update_profile(user_id, **editable)
    if profile is None:
        return _resp(404, {"error": "Profile not found"})
    return _resp(200, {"profile": profile.to_item()})


def _resp(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": CORS_HEADERS,
        "body": json.dumps(body),
    }
