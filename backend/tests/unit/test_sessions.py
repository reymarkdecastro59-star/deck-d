import json
import time

import pytest
import shared.db as db_module
from shared.models import Session
from handlers.sessions import handler
from tests.unit.conftest import make_event, USER_ID, USER_EMAIL, FakeLambdaContext


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


def test_post_session_zero_duration_rejected(ddb_table):
    """duration_sec must be > 0."""
    event = make_event(
        method="POST",
        body={
            "session_id": "s1",
            "game_exe": "game.exe",
            "game_name": "My Game",
            "started_at": 1_700_000_000,
            "ended_at": 1_700_003_600,
            "duration_sec": 0,
        },
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400
    assert json.loads(resp["body"])["error"] == "validation_failed"


def test_post_session_negative_duration_rejected(ddb_table):
    event = make_event(
        method="POST",
        body={
            "session_id": "s1",
            "game_exe": "game.exe",
            "game_name": "My Game",
            "started_at": 1_700_000_000,
            "ended_at": 1_700_003_600,
            "duration_sec": -60,
        },
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400
    assert json.loads(resp["body"])["error"] == "validation_failed"


def test_post_session_inverted_range_rejected(ddb_table):
    """started_at >= ended_at is nonsensical and must be rejected."""
    event = make_event(
        method="POST",
        body={
            "session_id": "s1",
            "game_exe": "game.exe",
            "game_name": "My Game",
            "started_at": 1_700_010_000,
            "ended_at": 1_700_000_000,
            "duration_sec": 3600,
        },
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400
    assert json.loads(resp["body"])["error"] == "validation_failed"


def test_post_session_equal_start_end_rejected(ddb_table):
    """started_at == ended_at is a zero-length session — reject."""
    ts = 1_700_000_000
    event = make_event(
        method="POST",
        body={
            "session_id": "s1",
            "game_exe": "game.exe",
            "game_name": "My Game",
            "started_at": ts,
            "ended_at": ts,
            "duration_sec": 1,
        },
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400
    assert json.loads(resp["body"])["error"] == "validation_failed"


def test_post_session_future_dated_rejected(ddb_table):
    """ended_at far in the future (beyond clock skew tolerance) must be rejected."""
    now = int(time.time())
    event = make_event(
        method="POST",
        body={
            "session_id": "s1",
            "game_exe": "game.exe",
            "game_name": "My Game",
            "started_at": now + 3600,
            "ended_at": now + 7200,
            "duration_sec": 3600,
        },
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400
    assert json.loads(resp["body"])["error"] == "validation_failed"


def test_post_session_slight_future_within_tolerance_accepted(ddb_table):
    """A session ending a few seconds in the future is accepted (clock skew tolerance)."""
    now = int(time.time())
    event = make_event(
        method="POST",
        body={
            "session_id": "s1",
            "game_exe": "game.exe",
            "game_name": "My Game",
            "started_at": now - 30,
            "ended_at": now + 10,
            "duration_sec": 40,
        },
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 201


def test_post_session_inflated_duration_rejected(ddb_table):
    """duration_sec must match ended_at - started_at within 5s.
    Without this, a caller can send a 60-second window with a 999999s duration
    and inflate the decay-weighted dashboard score."""
    event = make_event(
        method="POST",
        body={
            "session_id": "s1",
            "game_exe": "game.exe",
            "game_name": "My Game",
            "started_at": 1_700_000_000,
            "ended_at": 1_700_000_060,  # 60s window
            "duration_sec": 999_999,     # fabricated
        },
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400
    body = json.loads(resp["body"])
    assert body["error"] == "validation_failed"
    assert isinstance(body["details"], list)


def test_post_batch_rejects_child_with_inflated_duration(ddb_table):
    """SessionBatchCreate embeds list[SessionCreate], so the duration cross-check
    must propagate through the batch code path. If a batch of 3 has one bad
    child, the whole batch is rejected."""
    good_a = {
        "session_id": "ok-1",
        "game_exe": "game.exe", "game_name": "My Game",
        "started_at": 1_700_000_000, "ended_at": 1_700_003_600, "duration_sec": 3600,
    }
    bad = {
        "session_id": "bad",
        "game_exe": "game.exe", "game_name": "My Game",
        "started_at": 1_700_010_000, "ended_at": 1_700_010_060,
        "duration_sec": 999_999,  # 60s window, fake duration
    }
    good_b = {
        "session_id": "ok-2",
        "game_exe": "game.exe", "game_name": "My Game",
        "started_at": 1_700_020_000, "ended_at": 1_700_023_600, "duration_sec": 3600,
    }
    event = make_event(
        method="POST",
        resource="/sessions/batch",
        body={"sessions": [good_a, bad, good_b]},
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400
    assert json.loads(resp["body"])["error"] == "validation_failed"
    # And nothing landed in the store
    assert db_module.get_sessions(USER_ID, limit=10) == []


def test_post_session_duration_off_by_a_few_seconds_accepted(ddb_table):
    """A ±5s tolerance covers integer-rounding at session close on the agent."""
    event = make_event(
        method="POST",
        body={
            "session_id": "s1",
            "game_exe": "game.exe",
            "game_name": "My Game",
            "started_at": 1_700_000_000,
            "ended_at": 1_700_003_600,   # wall = 3600
            "duration_sec": 3597,         # off by 3s — allowed
        },
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 201


def test_post_session_duration_off_by_six_seconds_rejected(ddb_table):
    """One second past the ±5s tolerance boundary must be rejected."""
    event = make_event(
        method="POST",
        body={
            "session_id": "s1",
            "game_exe": "game.exe",
            "game_name": "My Game",
            "started_at": 1_700_000_000,
            "ended_at": 1_700_003_600,
            "duration_sec": 3606,  # 6s over — rejected
        },
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400
    assert json.loads(resp["body"])["error"] == "validation_failed"


# ---------------------------------------------------------------------------
# Device attribution via X-Device-Id / X-Device-Name headers (Phase 2)
# ---------------------------------------------------------------------------

import shared.db as _db_for_device_tests  # noqa: E402


def _session_body(session_id="s1", started_at=1_700_000_000) -> dict:
    return {
        "session_id": session_id,
        "game_exe": "game.exe",
        "game_name": "My Game",
        "started_at": started_at,
        "ended_at": started_at + 3600,
        "duration_sec": 3600,
    }


def test_post_session_without_device_header_stores_null_device_id(ddb_table):
    """Backward compat: pre-Phase-2 agents that don't send X-Device-Id still work."""
    event = make_event(method="POST", body=_session_body())
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 201
    stored = db_module.get_sessions(USER_ID, limit=10)
    assert stored[0].device_id is None


def test_post_session_with_device_header_auto_registers_and_stamps(ddb_table):
    event = make_event(
        method="POST",
        body=_session_body(),
        headers={"X-Device-Id": "dev-abc", "X-Device-Name": "Living Room PC"},
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 201
    # Session was stamped
    stored = db_module.get_sessions(USER_ID, limit=10)
    assert stored[0].device_id == "dev-abc"
    # Device row was auto-created
    device = _db_for_device_tests.get_device(USER_ID, "dev-abc")
    assert device is not None
    assert device.device_name == "Living Room PC"


def test_post_session_from_revoked_device_returns_403(ddb_table):
    _db_for_device_tests.touch_device(USER_ID, "dev-abc", "Living Room")
    _db_for_device_tests.revoke_device(USER_ID, "dev-abc")

    event = make_event(
        method="POST",
        body=_session_body(),
        headers={"X-Device-Id": "dev-abc", "X-Device-Name": "Living Room"},
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 403
    body = json.loads(resp["body"])
    assert body["error"] == "device_revoked"
    # Client-supplied device_id must NOT be echoed — it's an existence oracle.
    assert "device_id" not in body
    # No session written
    assert db_module.get_sessions(USER_ID, limit=10) == []


def test_post_session_header_lookup_is_case_insensitive(ddb_table):
    """API Gateway may lowercase header names — the handler must tolerate that."""
    event = make_event(
        method="POST",
        body=_session_body(),
        headers={"x-device-id": "dev-abc", "x-device-name": "PC"},
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 201
    stored = db_module.get_sessions(USER_ID, limit=10)
    assert stored[0].device_id == "dev-abc"


def test_post_batch_stamps_device_on_every_session(ddb_table):
    payload = {"sessions": [_session_body("s1"), _session_body("s2", 1_700_010_000)]}
    event = make_event(
        method="POST",
        resource="/sessions/batch",
        body=payload,
        headers={"X-Device-Id": "dev-abc", "X-Device-Name": "PC"},
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 201
    stored = db_module.get_sessions(USER_ID, limit=10)
    assert len(stored) == 2
    assert all(s.device_id == "dev-abc" for s in stored)


def test_post_batch_from_revoked_device_returns_403(ddb_table):
    _db_for_device_tests.touch_device(USER_ID, "dev-abc", "PC")
    _db_for_device_tests.revoke_device(USER_ID, "dev-abc")

    payload = {"sessions": [_session_body("s1")]}
    event = make_event(
        method="POST",
        resource="/sessions/batch",
        body=payload,
        headers={"X-Device-Id": "dev-abc", "X-Device-Name": "PC"},
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 403
    assert db_module.get_sessions(USER_ID, limit=10) == []


def test_post_session_rejects_new_device_beyond_cap(ddb_table):
    """Registering the 51st device fails with 429; existing devices still work."""
    for i in range(_db_for_device_tests.MAX_DEVICES_PER_USER):
        _db_for_device_tests.touch_device(USER_ID, f"dev-{i}", f"PC-{i}")

    event = make_event(
        method="POST",
        body=_session_body(),
        headers={"X-Device-Id": "dev-overflow", "X-Device-Name": "New PC"},
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 429
    assert json.loads(resp["body"])["error"] == "device_limit_exceeded"
    # Existing devices unaffected — resend from dev-0 succeeds
    event2 = make_event(
        method="POST",
        body=_session_body("existing-device-session"),
        headers={"X-Device-Id": "dev-0", "X-Device-Name": "PC-0"},
    )
    resp2 = handler(event2, FakeLambdaContext())
    assert resp2["statusCode"] == 201


# ---------------------------------------------------------------------------
# POST /sessions/batch
# ---------------------------------------------------------------------------

def _make_session_payload(
    session_id: str = "s1",
    started_at: int = 1_700_000_000,
    game_exe: str = "game.exe",
    game_name: str = "My Game",
) -> dict:
    return {
        "session_id": session_id,
        "game_exe": game_exe,
        "game_name": game_name,
        "started_at": started_at,
        "ended_at": started_at + 3600,
        "duration_sec": 3600,
        "label": "tracked",
    }


def _batch_event(body: dict | None = None, raw_body: str | None = None) -> dict:
    return make_event(
        method="POST",
        body=body,
        resource="/sessions/batch",
        raw_body=raw_body,
    )


def test_batch_happy_path(ddb_table):
    """3 valid sessions → 201, count=3, all 3 persisted."""
    sessions_payload = [
        _make_session_payload("s1", 1_700_000_000),
        _make_session_payload("s2", 1_700_010_000),
        _make_session_payload("s3", 1_700_020_000),
    ]
    event = _batch_event(body={"sessions": sessions_payload})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 201
    body = json.loads(resp["body"])
    assert body["count"] == 3
    assert set(body["session_ids"]) == {"s1", "s2", "s3"}
    # Verify all 3 are in DynamoDB
    stored = db_module.get_sessions(USER_ID, limit=10)
    assert len(stored) == 3


def test_batch_invalid_json(ddb_table):
    """Non-JSON body → 400 invalid_json."""
    event = _batch_event(raw_body="not-json{{")
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400
    assert json.loads(resp["body"])["error"] == "invalid_json"


def test_batch_missing_fields(ddb_table):
    """One session missing session_id → 400 validation_failed, nothing written."""
    bad_session = {
        "game_exe": "game.exe",
        "game_name": "My Game",
        "started_at": 1_700_000_000,
        "ended_at": 1_700_003_600,
        "duration_sec": 3600,
        # session_id is missing
    }
    event = _batch_event(body={"sessions": [bad_session]})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400
    body = json.loads(resp["body"])
    assert body["error"] == "validation_failed"
    # Nothing should have been written
    stored = db_module.get_sessions(USER_ID, limit=10)
    assert stored == []


def test_batch_empty_list(ddb_table):
    """Empty sessions list → 400 validation_failed."""
    event = _batch_event(body={"sessions": []})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400
    assert json.loads(resp["body"])["error"] == "validation_failed"


def test_batch_oversize(ddb_table):
    """26 sessions (over the 25-item cap) → 400 validation_failed."""
    sessions_payload = [
        _make_session_payload(f"s{i}", 1_700_000_000 + i * 1000)
        for i in range(26)
    ]
    event = _batch_event(body={"sessions": sessions_payload})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400
    assert json.loads(resp["body"])["error"] == "validation_failed"


def test_batch_duplicate_session_ids_last_wins(ddb_table):
    """Two sessions with the same session_id AND same started_at share the same sk.
    The second put_item overwrites the first; only 1 item persists."""
    shared_started_at = 1_700_000_000
    first = _make_session_payload("dup", shared_started_at, game_name="First Game")
    second = _make_session_payload("dup", shared_started_at, game_name="Second Game")
    # Distinct game_name so we can tell which one survived
    first["game_name"] = "First Game"
    second["game_name"] = "Second Game"

    event = _batch_event(body={"sessions": [first, second]})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 201
    body = json.loads(resp["body"])
    assert body["count"] == 2  # client sent 2; we wrote 2 (second silently overwrites)

    stored = db_module.get_sessions(USER_ID, limit=10)
    assert len(stored) == 1
    assert stored[0].game_name == "Second Game"


def test_batch_rejects_bad_child(ddb_table):
    """One invalid child (inverted range) rejects the whole batch — nothing written."""
    good = _make_session_payload("s1", 1_700_000_000)
    bad = _make_session_payload("s2", 1_700_010_000)
    bad["ended_at"] = bad["started_at"] - 1  # inverted range
    event = _batch_event(body={"sessions": [good, bad]})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400
    assert json.loads(resp["body"])["error"] == "validation_failed"
    stored = db_module.get_sessions(USER_ID, limit=10)
    assert stored == []


def test_batch_creates_profile(ddb_table):
    """A fresh user with no profile should have one created by the batch call."""
    fresh_user_id = "brand-new-user"
    fresh_email = "fresh@example.com"
    event = make_event(
        method="POST",
        resource="/sessions/batch",
        body={"sessions": [_make_session_payload("s1")]},
        user_id=fresh_user_id,
        email=fresh_email,
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 201
    profile = db_module.get_profile(fresh_user_id)
    assert profile is not None
    assert profile.email == fresh_email
