import json
from aws_lambda_powertools import Logger
from pydantic import ValidationError
from shared.auth import get_user_id
from shared.cors import CORS_HEADERS
from shared.db import get_profile, update_profile
from shared.schemas import ProfilePatch

logger = Logger(service="deckd-profile")


@logger.inject_lambda_context(correlation_id_path="requestContext.requestId")
def handler(event: dict, context) -> dict:
    try:
        method = event["httpMethod"]
        if method == "GET":
            return _get_profile(event)
        if method == "PATCH":
            return _patch_profile(event)
        return _resp(405, {"error": "Method not allowed"})
    except Exception:
        logger.exception("Unhandled error in profile handler")
        return _resp(500, {"error": "Internal server error"})


def _get_profile(event: dict) -> dict:
    user_id = get_user_id(event)
    profile = get_profile(user_id)
    if profile is None:
        logger.warning("profile_not_found", user_id=user_id)
        return _resp(404, {"error": "Profile not found"})
    logger.info("profile_fetched", user_id=user_id)
    return _resp(200, {"profile": profile.to_item()})


def _patch_profile(event: dict) -> dict:
    user_id = get_user_id(event)

    try:
        data = ProfilePatch.model_validate(json.loads(event.get("body") or "{}"))
    except ValidationError as e:
        return _resp(400, {"error": "validation_failed", "details": e.errors()})

    editable = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    profile = update_profile(user_id, **editable)
    if profile is None:
        logger.warning("profile_not_found_for_patch", user_id=user_id)
        return _resp(404, {"error": "Profile not found"})
    fields_updated = list(editable.keys())
    logger.info("profile_updated", user_id=user_id, fields_updated=fields_updated)
    return _resp(200, {"profile": profile.to_item()})


def _resp(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": CORS_HEADERS,
        "body": json.dumps(body),
    }
