import hashlib
import json
from decimal import Decimal

from aws_lambda_powertools import Logger
from shared.auth import get_user_id
from shared.cors import CORS_HEADERS
from shared.db import get_trending_daily

logger = Logger(service="deckd-recommendations")

_CACHE_HEADER = "private, max-age=300"


class _DecimalEncoder(json.JSONEncoder):
    """Convert Decimal to float for API responses (DynamoDB stores rating as Decimal)."""

    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


@logger.inject_lambda_context(correlation_id_path="requestContext.requestId")
def handler(event: dict, context) -> dict:
    try:
        return _get_recommendations(event)
    except Exception:
        logger.exception("Unhandled error in recommendations handler")
        return _resp(500, {"error": "Internal server error"})


def _get_recommendations(event: dict) -> dict:
    user_id = get_user_id(event)
    # Hash the sub before logging — no PII in logs.
    hashed = hashlib.sha256(user_id.encode()).hexdigest()[:12]

    item = get_trending_daily()

    if item is None:
        logger.warning("trending_item_missing", user_id_hash=hashed)
        trending = []
    else:
        trending = item.get("games", [])
        logger.info(
            "recommendations_fetched",
            user_id_hash=hashed,
            trending_count=len(trending),
        )

    body = {
        "trending": trending,
        "genre_based": None,
        "top_picks": None,
    }
    headers = {**CORS_HEADERS, "Cache-Control": _CACHE_HEADER}
    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps(body, cls=_DecimalEncoder),
    }


def _resp(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": CORS_HEADERS,
        "body": json.dumps(body),
    }
