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
    """Skip # summary comment lines at the top, then parse the CSV body."""
    lines = [ln for ln in body.splitlines() if not ln.startswith("#")]
    reader = csv.DictReader(io.StringIO("\n".join(lines)))
    return list(reader)


def _csv_header_line(body: str) -> str:
    """Return the first non-comment line — the CSV header row."""
    for ln in body.splitlines():
        if not ln.startswith("#"):
            return ln
    return ""


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
    """The CSV header line must be present after the summary comment block."""
    _seed_session("s1")

    event = _export_event("csv")
    resp = handler(event, FakeLambdaContext())

    header = _csv_header_line(resp["body"])
    assert "session_id" in header
    assert "game_name" in header
    assert "duration_sec" in header


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
    """No sessions → CSV with summary block + header row + zero data rows."""
    event = _export_event("csv")
    resp = handler(event, FakeLambdaContext())

    assert resp["statusCode"] == 200
    rows = _parse_csv(resp["body"])
    assert rows == []
    # Header must still be present after the # summary block
    assert "session_id" in _csv_header_line(resp["body"])


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


# ---------------------------------------------------------------------------
# Overlap-aware summary block (Phase 4)
# ---------------------------------------------------------------------------

def _seed_overlapping_pair(session_id_a: str, session_id_b: str, start: int, length: int):
    """Two full-overlap sessions on the same game — classic Phasmo case."""
    for sid in (session_id_a, session_id_b):
        db_module.put_session(Session(
            user_id=USER_ID,
            session_id=sid,
            game_exe="phasmo.exe", game_name="Phasmophobia",
            started_at=start, ended_at=start + length,
            duration_sec=length, label="tracked",
        ))


def test_export_json_summary_strips_overlap(ddb_table):
    """5h on PC1 + 5h on PC2 fully overlapping → raw_sum=10h, union=5h."""
    five_hours = 5 * 3600
    _seed_overlapping_pair("pc1", "pc2", 1_700_000_000, five_hours)

    resp = handler(_export_event("json"), FakeLambdaContext())
    payload = json.loads(resp["body"])
    assert payload["summary"]["session_count"] == 2
    assert payload["summary"]["raw_sum_sec"] == 2 * five_hours
    assert payload["summary"]["union_sec"] == five_hours
    assert payload["summary"]["overlap_stripped_sec"] == five_hours


def test_export_csv_summary_lines_visible_at_top(ddb_table):
    """CSV summary is emitted as # comment lines above the header."""
    five_hours = 5 * 3600
    _seed_overlapping_pair("pc1", "pc2", 1_700_000_000, five_hours)

    resp = handler(_export_event("csv"), FakeLambdaContext())
    lines = resp["body"].splitlines()
    comment_lines = [ln for ln in lines if ln.startswith("#")]
    assert len(comment_lines) >= 1
    joined = "\n".join(comment_lines)
    assert f"raw_sum_sec={2 * five_hours}" in joined
    assert f"union_sec={five_hours}" in joined
    assert f"overlap_stripped_sec={five_hours}" in joined
    # Raw rows are still present, both of them
    rows = _parse_csv(resp["body"])
    assert len(rows) == 2
