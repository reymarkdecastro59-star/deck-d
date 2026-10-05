"""Connect Steam (verified sign-in) and import through Steam's Web API.

  GET    /steam           — configured? connected account? last API result
  POST   /steam/connect   — {origin} → Steam login URL (one-time nonce)
  POST   /steam/link      — {params: openid.*} → verify with Steam, save the
                            link, then import right away
  POST   /steam/sync      — re-import the library through Steam's API
  DELETE /steam/link      — disconnect (imported data stays until removed)

When the profile's "Game details" are private Steam returns no library:
/steam/sync answers 409 steam_private and leaves a re-import request, so
the user's PC tracker reads Steam locally instead (the fallback) — for the
verified account only. Tracked sessions are never touched.
"""
import json
import secrets

from aws_lambda_powertools import Logger

from shared.auth import get_user_id
from shared.cors import CORS_HEADERS
from shared.imports import (
    delete_steam_link,
    get_steam_link,
    put_steam_link,
    put_steam_nonce,
    replace_import,
    request_import,
    set_steam_api_status,
    take_steam_nonce,
)
from shared import steam_api

logger = Logger(service="deckd-steam")


@logger.inject_lambda_context(correlation_id_path="requestContext.requestId")
def handler(event: dict, context) -> dict:
    try:
        method = event["httpMethod"]
        resource = event.get("resource") or ""
        if method == "GET":
            return _status(event)
        if not steam_api.api_key():
            return _resp(503, {"error": "steam_not_configured"})
        if method == "POST" and resource.endswith("/connect"):
            return _connect(event)
        if method == "POST" and resource.endswith("/link"):
            return _link(event)
        if method == "POST" and resource.endswith("/sync"):
            return _sync(get_user_id(event))
        if method == "DELETE" and resource.endswith("/link"):
            delete_steam_link(get_user_id(event))
            logger.info("steam_disconnected")
            return _resp(200, {"link": None})
        return _resp(405, {"error": "Method not allowed"})
    except Exception:
        logger.exception("Unhandled error in steam handler")
        return _resp(500, {"error": "Internal server error"})


def _serialize_link(link):
    if not link:
        return None
    steamid = link["steamid"]
    return {
        "steamid": steamid,
        "account_id": str(int(steamid) - steam_api.STEAMID64_BASE),
        "name": link.get("name"),
        "avatar": link.get("avatar"),
        "linked_at": int(link.get("linked_at", 0)),
        "api_ok": bool(link.get("api_ok")),
        "api_error": link.get("api_error"),
    }


def _status(event: dict) -> dict:
    user_id = get_user_id(event)
    return _resp(200, {
        "configured": bool(steam_api.api_key()),
        "link": _serialize_link(get_steam_link(user_id)),
    })


def _body(event: dict) -> dict:
    try:
        data = json.loads(event.get("body") or "{}")
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, ValueError):
        return {}


def _connect(event: dict) -> dict:
    user_id = get_user_id(event)
    origin = str(_body(event).get("origin") or "")
    # Only send the user back to DECK'D's own web app (no open redirect).
    if not steam_api.origin_allowed(origin):
        return _resp(400, {"error": "origin_not_allowed"})
    nonce = secrets.token_urlsafe(24)
    return_to = steam_api.return_to_for(origin, nonce)
    put_steam_nonce(user_id, nonce, return_to)
    return _resp(200, {"url": steam_api.login_url(return_to, origin)})


def _link(event: dict) -> dict:
    user_id = get_user_id(event)
    params = _body(event).get("params")
    if not isinstance(params, dict) or len(params) > 40:
        return _resp(400, {"error": "invalid_params"})
    pending = take_steam_nonce(user_id)  # single use, expires in 10 min
    if pending is None:
        return _resp(400, {"error": "sign_in_expired"})
    steamid = steam_api.verify_assertion(params, pending["return_to"])
    if steamid is None:
        logger.warning("steam_link_rejected")
        return _resp(400, {"error": "steam_verification_failed"})
    info = steam_api.persona(steamid) or {}
    put_steam_link(user_id, steamid, info.get("name"), info.get("avatar"))
    logger.info("steam_connected")
    result = _sync(user_id)
    body = json.loads(result["body"])
    body["link"] = _serialize_link(get_steam_link(user_id))
    # Connecting succeeded even if the library is private (409): report both.
    return _resp(200, body)


def _sync(user_id: str) -> dict:
    link = get_steam_link(user_id)
    if not link:
        return _resp(409, {"error": "steam_not_connected"})
    try:
        games = steam_api.owned_games(link["steamid"])
    except steam_api.SteamPrivate:
        set_steam_api_status(user_id, False, "private")
        request_import(user_id)  # the PC tracker reads Steam locally instead
        logger.info("steam_sync_private")
        return _resp(409, {"error": "steam_private", "fallback": "pc_requested"})
    except steam_api.SteamUnavailable as exc:
        set_steam_api_status(user_id, False, "unavailable")
        logger.warning("steam_sync_unavailable", err=str(exc))
        return _resp(502, {"error": "steam_unavailable"})
    summary = replace_import(user_id, "steam", games, link.get("name"), method="steam_api")
    set_steam_api_status(user_id, True)
    logger.info("steam_sync_ok", count=summary["count"])
    return _resp(200, {"import": {
        "source": "steam",
        "count": int(summary["count"]),
        "total_hours": round(int(summary["total_minutes"]) / 60, 1),
        "imported_at": int(summary["imported_at"]),
        "account_label": summary.get("account_label"),
        "method": "steam_api",
    }})


def _resp(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": CORS_HEADERS, "body": json.dumps(body)}
