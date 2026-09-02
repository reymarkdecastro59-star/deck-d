import csv
import io
import json
import pytest
import shared.db as db_module
from shared.models import Session
from handlers.export import handler
from tests.unit.conftest import make_event, USER_ID, FakeLambdaContext


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _seed_session(session_id: str, started_at: int = 1_700_000_000) -> Session:
    s = Session(
        user_id=USER_ID,
        session_id=session_id,
        game_exe="game.exe",
        game_name="My Game",
        started_at=started_at,
        ended_at=started_at + 3600,
        duration_sec=3600,
        label="tracked",
    )
    db_module.put_session(s)
    return s


def _export_event(format_param: str | None = None) -> dict:
    qsp = {"format": format_param} if format_param is not None else None
    return make_event(method="GET", query_params=qsp)


def _parse_csv(body: str) -> list[dict]:
    reader = csv.DictReader(io.StringIO(body))
    return list(reader)


# ---------------------------------------------------------------------------
# CSV happy path
# ---------------------------------------------------------------------------

def test_export_csv_happy_path(ddb_table):
    """3 seeded sessions → 200, Content-Type text/csv, Content-Disposition attachment, 3 data rows."""
    _seed_session("s1", 1_700_000_000)
    _seed_session("s2", 1_700_010_000)
    _seed_session("s3", 1_700_020_000)

    event = _export_event("csv")
    resp = handler(event, FakeLambdaContext())

    assert resp["statusCode"] == 200
    assert "text/csv" in resp["headers"]["Content-Type"]
    assert resp["headers"]["Content-Disposition"].startswith("attachment; filename=")
    assert resp["headers"]["Content-Disposition"].endswith(".csv\"")

    rows = _parse_csv(resp["body"])
    assert len(rows) == 3
    session_ids = {r["session_id"] for r in rows}
    assert session_ids == {"s1", "s2", "s3"}


def test_export_csv_has_header_row(ddb_table):
    """The raw body must contain the CSV header line."""
    _seed_session("s1")

    event = _export_event("csv")
    resp = handler(event, FakeLambdaContext())

    first_line = resp["body"].splitlines()[0]
    assert "session_id" in first_line
    assert "game_name" in first_line
    assert "duration_sec" in first_line


# ---------------------------------------------------------------------------
# Default format
# ---------------------------------------------------------------------------

def test_export_csv_default_format(ddb_table):
    """No format param → defaults to CSV."""
    _seed_session("s1")

    event = _export_event(None)  # no queryStringParameters
    resp = handler(event, FakeLambdaContext())

    assert resp["statusCode"] == 200
    assert "text/csv" in resp["headers"]["Content-Type"]


# ---------------------------------------------------------------------------
# JSON happy path
# ---------------------------------------------------------------------------

def test_export_json_happy_path(ddb_table):
    """format=json → 200, application/json, body has count=3 and sessions list."""
    _seed_session("s1", 1_700_000_000)
    _seed_session("s2", 1_700_010_000)
    _seed_session("s3", 1_700_020_000)

    event = _export_event("json")
    resp = handler(event, FakeLambdaContext())

    assert resp["statusCode"] == 200
    assert "application/json" in resp["headers"]["Content-Type"]
    assert resp["headers"]["Content-Disposition"].endswith(".json\"")

    payload = json.loads(resp["body"])
    assert payload["count"] == 3
    assert len(payload["sessions"]) == 3
    # Each session item should have a pk/sk (from to_item())
    assert all("pk" in s for s in payload["sessions"])


# ---------------------------------------------------------------------------
# Empty sessions
# ---------------------------------------------------------------------------

def test_export_empty_csv(ddb_table):
    """No sessions → CSV with only the header row."""
    event = _export_event("csv")
    resp = handler(event, FakeLambdaContext())

    assert resp["statusCode"] == 200
    rows = _parse_csv(resp["body"])
    assert rows == []
    # Header must still be present
    assert "session_id" in resp["body"].splitlines()[0]


def test_export_empty_json(ddb_table):
    """No sessions → JSON with count=0 and empty sessions list."""
    event = _export_event("json")
    resp = handler(event, FakeLambdaContext())

    assert resp["statusCode"] == 200
    payload = json.loads(resp["body"])
    assert payload["count"] == 0
    assert payload["sessions"] == []


# ---------------------------------------------------------------------------
# Invalid / edge-case format values
# ---------------------------------------------------------------------------

def test_export_invalid_format(ddb_table):
    """format=xml → 400, error=invalid_format."""
    event = _export_event("xml")
    resp = handler(event, FakeLambdaContext())

    assert resp["statusCode"] == 400
    body = json.loads(resp["body"])
    assert body["error"] == "invalid_format"
    assert "details" in body


def test_export_case_insensitive_format(ddb_table):
    """format=CSV (uppercase) → treated as csv → 200."""
    _seed_session("s1")

    event = _export_event("CSV")
    resp = handler(event, FakeLambdaContext())

    assert resp["statusCode"] == 200
    assert "text/csv" in resp["headers"]["Content-Type"]
