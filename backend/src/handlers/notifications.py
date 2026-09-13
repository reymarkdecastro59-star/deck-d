import json
import time
from aws_lambda_powertools import Logger
from shared.auth import get_user_id
from shared.cors import CORS_HEADERS
from shared.db import get_sessions, list_devices
from shared.intervals import union_seconds

logger = Logger(service="deckd-notifications")

# Derived notifications only — no notifications table yet. Each rule below
# scans existing state (devices + sessions) and emits deterministic items
# with stable IDs so the client's localStorage read-set stays consistent
# across polls. When we add a real inbox table, this handler shifts to a
# hybrid: stored + derived merged by id.

DEVICE_NEW_WINDOW_SEC = 7 * 24 * 3600           # highlight fresh devices for a week
DEVICE_REVOKED_WINDOW_SEC = 30 * 24 * 3600      # revocation notices linger a month
INACTIVITY_THRESHOLD_SEC = 14 * 24 * 3600       # 14d without a session = nudge
HOUR_MILESTONES = (10, 50, 100, 250, 500, 1000)


@logger.inject_lambda_context(correlation_id_path="requestContext.requestId")
def handler(event: dict, context) -> dict:
    try:
        if event.get("httpMethod") != "GET":
            return _resp(405, {"error": "Method not allowed"})
        user_id = get_user_id(event)
        now = int(time.time())

        devices = list_devices(user_id)
        sessions = get_sessions(user_id, limit=500)

        items: list[dict] = []
        items.extend(_device_notifications(devices, now))
        items.extend(_activity_notifications(sessions, now))
        items.extend(_milestone_notifications(sessions))

        # Sort newest first, but keep 'warn' severity ahead of 'info' when
        # timestamps tie so the nudge doesn't get buried.
        items.sort(key=lambda n: (n["ts"], 0 if n["severity"] == "warn" else 1), reverse=True)

        logger.info("notifications_fetched", count=len(items))
        return _resp(200, {"notifications": items})
    except Exception:
        logger.exception("Unhandled error in notifications handler")
        return _resp(500, {"error": "Internal server error"})


def _device_notifications(devices, now: int) -> list[dict]:
    out: list[dict] = []
    for d in devices:
        if d.revoked_at and (now - d.revoked_at) < DEVICE_REVOKED_WINDOW_SEC:
            out.append({
                "id": f"device-revoked:{d.device_id}",
                "type": "device_revoked",
                "severity": "info",
                "title": f"{d.device_name} was revoked",
                "body": "Its next sync attempt will be rejected. Historic sessions stay.",
                "ts": d.revoked_at,
                "link": "/devices",
            })
            continue
        if not d.revoked_at and d.first_seen and (now - d.first_seen) < DEVICE_NEW_WINDOW_SEC:
            out.append({
                "id": f"device-new:{d.device_id}",
                "type": "device_new",
                "severity": "info",
                "title": f"{d.device_name} started syncing",
                "body": "New tracker registered. Rename it in Devices if you'd like.",
                "ts": d.first_seen,
                "link": "/devices",
            })
    return out


def _activity_notifications(sessions, now: int) -> list[dict]:
    if not sessions:
        return []
    # Sessions come back newest-first from the query. If the freshest one is
    # older than the threshold, surface a single nudge — we don't want to
    # spam a notification per idle day.
    latest = max(s.ended_at for s in sessions)
    idle_sec = now - latest
    if idle_sec < INACTIVITY_THRESHOLD_SEC:
        return []
    days = idle_sec // (24 * 3600)
    # Stable id per idle-week bucket keeps the read state sticky between
    # polls (so it doesn't reappear every refresh) but re-emits after a
    # further week of silence.
    week_bucket = idle_sec // (7 * 24 * 3600)
    return [{
        "id": f"inactive:{week_bucket}",
        "type": "inactive",
        "severity": "warn",
        "title": f"No sessions in {days} days",
        "body": "Your tracker hasn't logged anything recently. Check it's still running.",
        "ts": latest,
        "link": "/devices",
    }]


def _milestone_notifications(sessions) -> list[dict]:
    if not sessions:
        return []
    intervals = [(s.started_at, s.ended_at) for s in sessions]
    total_hours = union_seconds(intervals) / 3600
    # Emit only the highest milestone crossed — otherwise a 500h user sees
    # a wall of 10/50/100/250 notices. Bucket ID keys off the crossed
    # threshold so it stays put until the next milestone.
    crossed = [m for m in HOUR_MILESTONES if total_hours >= m]
    if not crossed:
        return []
    highest = max(crossed)
    return [{
        "id": f"milestone:{highest}",
        "type": "milestone",
        "severity": "info",
        "title": f"You crossed {highest} hours",
        "body": "Total tracked wall-clock time across all games.",
        "ts": int(time.time()),
        "link": "/stats",
    }]


def _resp(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": CORS_HEADERS,
        "body": json.dumps(body),
    }
