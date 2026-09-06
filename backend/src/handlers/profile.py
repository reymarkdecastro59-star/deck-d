import hashlib
import json
import os
import boto3
from aws_lambda_powertools import Logger
from pydantic import ValidationError
from shared.auth import get_user_id
from shared.cors import CORS_HEADERS
from shared.db import get_profile, update_profile, delete_all_user_items
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
        if method == "DELETE":
            return _delete_profile(event)
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
        return _resp(400, {"error": "validation_failed", "details": e.errors(include_context=False, include_input=False, include_url=False)})

    editable = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    profile = update_profile(user_id, **editable)
    if profile is None:
        logger.warning("profile_not_found_for_patch", user_id=user_id)
        return _resp(404, {"error": "Profile not found"})
    fields_updated = list(editable.keys())
    logger.info("profile_updated", user_id=user_id, fields_updated=fields_updated)
    return _resp(200, {"profile": profile.to_item()})


def _delete_profile(event: dict) -> dict:
    user_id = get_user_id(event)

    # 1. Hard-delete all DynamoDB items for this user.
    items_deleted = delete_all_user_items(user_id)

    # 2. Remove the Cognito user — idempotent (UserNotFoundException => still 204).
    user_pool_id = os.environ.get("USER_POOL_ID", "")
    if user_pool_id:
        cognito = boto3.client("cognito-idp")
        try:
            cognito.admin_delete_user(UserPoolId=user_pool_id, Username=user_id)
        except cognito.exceptions.UserNotFoundException:
            pass  # already deleted — idempotent

    # 3. Audit log — hash the user_id so no raw PII lands in CloudWatch.
    user_id_hash = hashlib.sha256(user_id.encode()).hexdigest()[:16]
    logger.info(
        "account_erased",
        user_id_hash=user_id_hash,
        items_deleted=items_deleted,
    )

    # 4. 204 No Content — empty body per HTTP spec.
    return {
        "statusCode": 204,
        "headers": CORS_HEADERS,
        "body": "",
    }


def _resp(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": CORS_HEADERS,
        "body": json.dumps(body),
    }
