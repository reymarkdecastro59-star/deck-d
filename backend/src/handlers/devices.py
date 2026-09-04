import json
from aws_lambda_powertools import Logger
from pydantic import ValidationError
from shared.auth import get_user_id
from shared.cors import CORS_HEADERS
from shared.db import list_devices, rename_device, revoke_device, get_device
from shared.schemas import DevicePatch

logger = Logger(service="deckd-devices")


@logger.inject_lambda_context(correlation_id_path="requestContext.requestId")
def handler(event: dict, context) -> dict:
    try:
        method = event["httpMethod"]
        path_params = event.get("pathParameters") or {}
        device_id = path_params.get("device_id")

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
