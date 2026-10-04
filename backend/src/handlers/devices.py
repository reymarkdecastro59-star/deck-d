import json
from aws_lambda_powertools import Logger
from pydantic import ValidationError
from typing import Optional

from shared.auth import get_user_email, get_user_id
from shared.cors import CORS_HEADERS
from shared.db import (
    DeviceLimitExceededError,
    get_device,
    get_or_create_profile,
    list_devices,
    rename_device,
    revoke_device,
    touch_device,
)
from shared.schemas import DevicePatch

logger = Logger(service="deckd-devices")


@logger.inject_lambda_context(correlation_id_path="requestContext.requestId")
def handler(event: dict, context) -> dict:
    try:
        method = event["httpMethod"]
        path_params = event.get("pathParameters") or {}
        device_id = path_params.get("device_id")

        if method == "POST" and (event.get("resource") or "").endswith("/heartbeat"):
            return _heartbeat(event)
        if method == "GET":
            return _list(event)
        if method == "PATCH" and device_id:
            return _patch(event, device_id)
        if method == "DELETE" and device_id:
            return _delete(event, device_id)
        return _resp(405, {"error": "Method not allowed"})
    except Exception:
        logger.exception("Unhandled error in devices handler")
        return _resp(500, {"error": "Internal server error"})


def _get_header(event: dict, name: str) -> Optional[str]:
    """Case-insensitive header lookup — API Gateway may lowercase names."""
    target = name.lower()
    for k, v in (event.get("headers") or {}).items():
        if k.lower() == target:
            return v
    return None


def _heartbeat(event: dict) -> dict:
    """Agent check-in (every sync tick). Registers/touches the device so a
    signed-in tracker shows as connected before any game is played — devices
    used to be registered only by the first session upload, so the web showed
    "No tracker yet" for a perfectly healthy agent. Same revoke and device-cap
    rules as session uploads.
    """
    user_id = get_user_id(event)
    device_id = _get_header(event, "X-Device-Id")
    if not device_id:
        return _resp(400, {"error": "missing_device_id"})
    device_name = _get_header(event, "X-Device-Name") or "unnamed-device"

    get_or_create_profile(user_id, get_user_email(event))
    try:
        device = touch_device(user_id, device_id, device_name)
    except DeviceLimitExceededError:
        logger.warning("device_limit_exceeded", user_id=user_id)
        return _resp(429, {"error": "device_limit_exceeded"})
    if device.is_revoked:
        # Don't echo the client-supplied id back (existence oracle).
        logger.warning("heartbeat_from_revoked_device", user_id=user_id)
        return _resp(403, {"error": "device_revoked"})
    return _resp(200, {"device": _serialize(device)})


def _list(event: dict) -> dict:
    user_id = get_user_id(event)
    devices = list_devices(user_id)
    return _resp(200, {"devices": [_serialize(d) for d in devices]})


def _patch(event: dict, device_id: str) -> dict:
    user_id = get_user_id(event)
    try:
        data = DevicePatch.model_validate(json.loads(event.get("body") or "{}"))
    except ValidationError as e:
        return _resp(400, {"error": "validation_failed",
                           "details": e.errors(include_context=False, include_input=False, include_url=False)})
    device = rename_device(user_id, device_id, data.device_name)
    if device is None:
        return _resp(404, {"error": "Device not found"})
    logger.info("device_renamed", device_id=device_id, device_name=data.device_name)
    return _resp(200, {"device": _serialize(device)})


def _delete(event: dict, device_id: str) -> dict:
    """
    'Delete' is really 'revoke' — we keep the row so future POSTs from this
    device_id can be recognised and rejected with 403 (rather than silently
    re-registering).
    """
    user_id = get_user_id(event)
    device = revoke_device(user_id, device_id)
    if device is None:
        return _resp(404, {"error": "Device not found"})
    logger.info("device_revoked", device_id=device_id)
    return _resp(200, {"device": _serialize(device)})


def _serialize(d) -> dict:
    return {
        "device_id": d.device_id,
        "device_name": d.device_name,
        "first_seen": d.first_seen,
        "last_seen": d.last_seen,
        "revoked_at": d.revoked_at,
    }


def _resp(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": CORS_HEADERS,
        "body": json.dumps(body),
    }
