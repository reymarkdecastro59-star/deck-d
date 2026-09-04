import csv
import io
import json
import time
from aws_lambda_powertools import Logger
from shared.auth import get_user_id
from shared.cors import CORS_HEADERS
from shared.db import iter_all_sessions
from shared.intervals import union_seconds

logger = Logger(service="deckd-export")

CSV_FIELDS = ["session_id", "game_name", "game_exe", "started_at", "ended_at", "duration_sec", "label"]


def _summary(sessions: list) -> dict:
    """Overlap-stripped totals + raw sum so consumers can see the delta."""
    raw_sum = sum(s.duration_sec for s in sessions)
    union = union_seconds([(s.started_at, s.ended_at) for s in sessions])
    return {
        "session_count": len(sessions),
        "raw_sum_sec": raw_sum,
        "union_sec": union,
        "overlap_stripped_sec": raw_sum - union,
    }


@logger.inject_lambda_context(correlation_id_path="requestContext.requestId")
def handler(event: dict, context) -> dict:
    try:
        user_id = get_user_id(event)
        qsp = event.get("queryStringParameters") or {}
        fmt = (qsp.get("format") or "csv").lower()

        if fmt not in ("csv", "json"):
            return _resp(400, {"error": "invalid_format", "details": "format must be 'csv' or 'json'"})

        sessions = iter_all_sessions(user_id)
        timestamp = int(time.time())
        summary = _summary(sessions)
        logger.info("export_generated", user_id=user_id, count=len(sessions), format=fmt)

        if fmt == "json":
            body = json.dumps({
                "summary": summary,
                "count": len(sessions),
                "sessions": [s.to_item() for s in sessions],
            })
            return _download_resp(body, "application/json", f"deckd-export-{timestamp}.json")

        # CSV path — three comment lines at the top for the summary, then the
        # standard header + rows. A well-behaved CSV reader will surface the
        # comment lines to the user as a note; strict readers can skip.
        buf = io.StringIO()
        buf.write(f"# DECK'D export — {len(sessions)} sessions\n")
        buf.write(
            f"# raw_sum_sec={summary['raw_sum_sec']}, "
            f"union_sec={summary['union_sec']} (overlap-stripped), "
            f"overlap_stripped_sec={summary['overlap_stripped_sec']}\n"
        )
        buf.write("# Rows below are every session — raw, not deduplicated.\n")
        writer = csv.DictWriter(buf, fieldnames=CSV_FIELDS, extrasaction="ignore")
        writer.writeheader()
        for s in sessions:
            writer.writerow({f: getattr(s, f) for f in CSV_FIELDS})
        return _download_resp(buf.getvalue(), "text/csv; charset=utf-8", f"deckd-export-{timestamp}.csv")

    except Exception:
        logger.exception("Unhandled error in export handler")
        return _resp(500, {"error": "Internal server error"})


def _resp(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": CORS_HEADERS,
        "body": json.dumps(body),
    }


def _download_resp(body: str, content_type: str, filename: str) -> dict:
    headers = dict(CORS_HEADERS)
    headers["Content-Type"] = content_type
    headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return {
        "statusCode": 200,
        "headers": headers,
        "body": body,
    }
