import json
import pytest
import shared.db as db_module
from shared.models import Session
from handlers.sessions import handler
from tests.unit.conftest import make_event, USER_ID, FakeLambdaContext


def _seed_session(session_id="s1", started_at=1_700_000_000):
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


def test_post_session_success(ddb_table):
    event = make_event(
        method="POST",
        body={
            "session_id": "s1",
            "game_exe": "game.exe",
            "game_name": "My Game",
            "started_at": 1_700_000_000,
            "ended_at": 1_700_003_600,
            "duration_sec": 3600,
        },
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 201
    assert json.loads(resp["body"])["session_id"] == "s1"


def test_post_session_missing_field(ddb_table):
    event = make_event(method="POST", body={"session_id": "s1"})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400
    assert json.loads(resp["body"])["error"] == "validation_failed"


def test_get_sessions_empty(ddb_table):
    event = make_event(method="GET")
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 200
    assert json.loads(resp["body"])["sessions"] == []


def test_get_sessions_returns_data(ddb_table):
    _seed_session()
    event = make_event(method="GET")
    resp = handler(event, FakeLambdaContext())
    body = json.loads(resp["body"])
    assert resp["statusCode"] == 200
    assert len(body["sessions"]) == 1


def test_delete_session_success(ddb_table):
    _seed_session(session_id="s1")
    event = make_event(method="DELETE", path_params={"session_id": "s1"})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 204


def test_delete_session_not_found(ddb_table):
    event = make_event(method="DELETE", path_params={"session_id": "ghost"})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 404


def test_patch_session_success(ddb_table):
    _seed_session(session_id="s1")
    event = make_event(method="PATCH", path_params={"session_id": "s1"}, body={"label": "focus"})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["session"]["label"] == "focus"


def test_patch_session_not_found(ddb_table):
    event = make_event(method="PATCH", path_params={"session_id": "ghost"}, body={"label": "focus"})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 404


def test_patch_session_missing_label(ddb_table):
    _seed_session(session_id="s1")
    event = make_event(method="PATCH", path_params={"session_id": "s1"}, body={"other": "field"})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400
    assert json.loads(resp["body"])["error"] == "validation_failed"


def test_post_session_wrong_type(ddb_table):
    """duration_sec must be int — passing a string should yield 400."""
    event = make_event(
        method="POST",
        body={
            "session_id": "s1",
            "game_exe": "game.exe",
            "game_name": "My Game",
            "started_at": 1_700_000_000,
            "ended_at": 1_700_003_600,
            "duration_sec": "not-a-number",
        },
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400
    body = json.loads(resp["body"])
    assert body["error"] == "validation_failed"
    assert isinstance(body["details"], list)


def test_patch_session_label_too_long(ddb_table):
    """label longer than 64 chars should be rejected."""
    _seed_session(session_id="s1")
    event = make_event(
        method="PATCH",
        path_params={"session_id": "s1"},
        body={"label": "x" * 65},
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400
    assert json.loads(resp["body"])["error"] == "validation_failed"


def test_post_session_empty_body(ddb_table):
    """Empty body (None) should return 400 validation error."""
    event = make_event(method="POST", body=None)
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400
    assert json.loads(resp["body"])["error"] == "validation_failed"
