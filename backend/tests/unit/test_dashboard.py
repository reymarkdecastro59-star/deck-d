import json
import pytest
import shared.db as db_module
from shared.models import Session
from handlers.dashboard import handler
from tests.unit.conftest import make_event, USER_ID


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
    resp = handler(event, None)
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
    resp = handler(event, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["total_sessions"] == 0
    assert body["total_hours"] == 0.0
    assert body["games"] == []
