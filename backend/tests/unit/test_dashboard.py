import json
import pytest
import shared.db as db_module
from shared.models import Session
from handlers.dashboard import handler
from tests.unit.conftest import make_event, USER_ID, FakeLambdaContext


def _seed(game_name: str, duration_sec: int, session_id: str, started_at: int):
    s = Session(
        user_id=USER_ID,
        session_id=session_id,
        game_exe=f"{game_name}.exe",
        game_name=game_name,
        started_at=started_at,
        ended_at=started_at + duration_sec,
        duration_sec=duration_sec,
        label="tracked",
    )
    db_module.put_session(s)


def test_dashboard_aggregation(ddb_table):
    _seed("Minecraft", 3600, "s1", 1_700_000_000)
    _seed("Minecraft", 1800, "s2", 1_700_010_000)
    _seed("Valorant", 7200, "s3", 1_700_020_000)

    event = make_event(method="GET")
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])

    assert body["total_sessions"] == 3
    assert body["total_hours"] == round((3600 + 1800 + 7200) / 3600, 2)

    games_by_name = {g["game"]: g for g in body["games"]}
    assert "Minecraft" in games_by_name
    assert "Valorant" in games_by_name
    assert games_by_name["Minecraft"]["total_sec"] == 5400
    assert games_by_name["Valorant"]["total_sec"] == 7200

    # Valorant should be first (highest total_sec)
    assert body["games"][0]["game"] == "Valorant"


def test_dashboard_empty(ddb_table):
    event = make_event(method="GET")
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["total_sessions"] == 0
    assert body["total_hours"] == 0.0
    assert body["games"] == []


# ---------------------------------------------------------------------------
# Time-range filtering tests
# ---------------------------------------------------------------------------

def test_dashboard_time_range_filters(ddb_table):
    _seed("Minecraft", 3600, "s1", 1_700_000_000)   # outside range (before from)
    _seed("Valorant", 7200, "s2", 1_700_010_000)    # inside range
    _seed("Apex", 1800, "s3", 1_700_020_000)        # outside range (after to)

    event = make_event(method="GET", query_params={"from": "1700005000", "to": "1700015000"})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])

    assert body["total_sessions"] == 1
    assert body["total_hours"] == round(7200 / 3600, 2)
    assert len(body["games"]) == 1
    assert body["games"][0]["game"] == "Valorant"
    assert "range" in body
    assert body["range"]["from"] == 1700005000
    assert body["range"]["to"] == 1700015000


def test_dashboard_no_range_backward_compatible(ddb_table):
    _seed("Minecraft", 3600, "s1", 1_700_000_000)
    _seed("Valorant", 7200, "s2", 1_700_010_000)

    event = make_event(method="GET")
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])

    assert body["total_sessions"] == 2
    assert "range" not in body


def test_dashboard_only_from(ddb_table):
    # Seeds in the past; from=1_700_010_000 excludes the earliest one
    _seed("Minecraft", 3600, "s1", 1_700_000_000)
    _seed("Valorant", 7200, "s2", 1_700_010_000)

    event = make_event(method="GET", query_params={"from": "1700010000"})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])

    # Only Valorant session is at/after from; default to=now captures it
    assert body["total_sessions"] == 1
    assert body["games"][0]["game"] == "Valorant"
    assert "range" in body
    assert body["range"]["from"] == 1700010000


def test_dashboard_only_to(ddb_table):
    # Seeds in the past; to=1_700_005_000 includes only the earliest session
    _seed("Minecraft", 3600, "s1", 1_700_000_000)
    _seed("Valorant", 7200, "s2", 1_700_010_000)

    event = make_event(method="GET", query_params={"to": "1700005000"})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])

    # Only Minecraft session is at/before to; default from=0 includes it
    assert body["total_sessions"] == 1
    assert body["games"][0]["game"] == "Minecraft"
    assert "range" in body
    assert body["range"]["to"] == 1700005000


def test_dashboard_invalid_range_from_gt_to(ddb_table):
    event = make_event(method="GET", query_params={"from": "1700020000", "to": "1700010000"})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400
    body = json.loads(resp["body"])
    assert body["error"] == "invalid_range"
    assert "details" in body


def test_dashboard_invalid_params_not_int(ddb_table):
    event = make_event(method="GET", query_params={"from": "abc"})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400
    body = json.loads(resp["body"])
    assert body["error"] == "invalid_range"
    assert "details" in body
