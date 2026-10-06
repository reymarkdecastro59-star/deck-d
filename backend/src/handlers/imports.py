"""Steam import API (keyed by source so more launchers can follow).

  GET    /imports            — what's imported (per launcher) + pending request
  PUT    /imports/{source}   — the tracker uploads a launcher's full list;
                               REPLACES that launcher's previous import
  DELETE /imports/{source}   — remove a launcher's imported data
  POST   /imports/request    — the web asks the user's PC to re-import (the
                               launcher files live on the PC, so only the
                               tracker can read them; it sees the request on
                               its next heartbeat, within about a minute)

Tracked sessions are never touched by any of these.
"""
import json

from aws_lambda_powertools import Logger
from pydantic import ValidationError

from shared.auth import get_user_id
from shared.cors import CORS_HEADERS
from shared.imports import (
    SOURCES,
    clear_import_request,
    delete_import,
    get_import_request,
    get_steam_link,
    list_import_summaries,
    replace_import,
    request_import,
    resolve_steam_names,
)
from shared.schemas import ImportPut

logger = Logger(service="deckd-imports")


@logger.inject_lambda_context(correlation_id_path="requestContext.requestId")
def handler(event: dict, context) -> dict:
    try:
        method = event["httpMethod"]
        resource = event.get("resource") or ""
        source = (event.get("pathParameters") or {}).get("source")

        if method == "GET":
            return _list(event)
        if method == "POST" and resource.endswith("/request"):
            return _request(event)
        if source not in SOURCES:
            return _resp(404, {"error": "unknown_source"})
        if method == "PUT":
            return _put(event, source)
        if method == "DELETE":
            return _delete(event, source)
        return _resp(405, {"error": "Method not allowed"})
    except Exception:
        logger.exception("Unhandled error in imports handler")
        return _resp(500, {"error": "Internal server error"})


def _serialize(summary: dict) -> dict:
    return {
        "source": summary["source"],
        "count": int(summary.get("count", 0)),
        "total_hours": round(int(summary.get("total_minutes", 0)) / 60, 1),
        "imported_at": int(summary.get("imported_at", 0)),
        "account_label": summary.get("account_label"),
        "method": summary.get("method", "pc"),
    }


def _list(event: dict) -> dict:
    user_id = get_user_id(event)
    return _resp(200, {
        "imports": [_serialize(s) for s in list_import_summaries(user_id)],
        "requested_at": get_import_request(user_id),
    })


def _request(event: dict) -> dict:
    user_id = get_user_id(event)
    requested_at = request_import(user_id)
    logger.info("import_requested")
    return _resp(202, {"requested_at": requested_at})


def _put(event: dict, source: str) -> dict:
    user_id = get_user_id(event)
    try:
        data = ImportPut.model_validate(json.loads(event.get("body") or "{}"))
    except (ValidationError, json.JSONDecodeError, ValueError) as e:
        details = e.errors(include_context=False, include_input=False, include_url=False) \
            if isinstance(e, ValidationError) else "invalid_json"
        return _resp(400, {"error": "validation_failed", "details": details})

    # While the Steam connection imports fine, it's the source of truth: a
    # PC upload would replace the full library with one PC's view of it.
    if source == "steam":
        link = get_steam_link(user_id)
        if link and link.get("api_ok"):
            return _resp(409, {"error": "steam_connected"})

    started = int(event.get("requestContext", {}).get("requestTimeEpoch", 0) / 1000) or None
    games = [g.model_dump() for g in data.games]
    # Steam ids are numeric app ids. They're sent to Steam's store API and
    # used in image URLs, so nothing else is accepted for this source.
    if source == "steam" and any(not g["external_id"].isdigit() for g in games):
        return _resp(400, {"error": "validation_failed", "details": "steam external_id must be numeric"})

    # Steam: the tracker knows titles only for installed games. Fill the rest
    # from Steam's public store data; unresolved ones keep a placeholder.
    if source == "steam":
        unnamed = [g["external_id"] for g in games if not g["name"]]
        names = resolve_steam_names(unnamed) if unnamed else {}
        for g in games:
            if not g["name"]:
                g["name"] = names.get(g["external_id"]) or f"Steam app {g['external_id']}"

    summary = replace_import(user_id, source, games, data.account_label)
    clear_import_request(user_id, started or summary["imported_at"])
    logger.info("import_replaced", source=source, count=summary["count"])
    return _resp(200, {"import": _serialize(summary)})


def _delete(event: dict, source: str) -> dict:
    user_id = get_user_id(event)
    removed = delete_import(user_id, source)
    logger.info("import_deleted", source=source, count=removed)
    return _resp(200, {"removed": removed})


def _resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": CORS_HEADERS, "body": json.dumps(body)}
