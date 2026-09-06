import hashlib
import json
import logging
import os
import time
import pytest
from unittest.mock import MagicMock, patch
import shared.db as db_module
from shared.models import Session, Device
from handlers.profile import handler
from tests.unit.conftest import make_event, USER_ID, USER_EMAIL, FakeLambdaContext

OTHER_USER_ID = "user-other-999"
OTHER_USER_EMAIL = "other@example.com"


def _seed_profile(user_id: str = USER_ID, email: str = USER_EMAIL):
    db_module.get_or_create_profile(user_id, email)


def _seed_sessions(user_id: str = USER_ID, count: int = 5) -> list[Session]:
    now = int(time.time())
    sessions = []
    for i in range(count):
        s = Session(
            user_id=user_id,
            session_id=f"sess-{i}",
            game_exe="game.exe",
            game_name="Test Game",
            started_at=now - 3600 + i * 60,
            ended_at=now - 3600 + i * 60 + 30,
            duration_sec=30,
        )
        db_module.put_session(s)
        sessions.append(s)
    return sessions


def _seed_devices(user_id: str = USER_ID, count: int = 3) -> list[Device]:
    now = int(time.time())
    devices = []
    for i in range(count):
        d = Device(
            user_id=user_id,
            device_id=f"device-{i}",
            device_name=f"PC {i}",
            first_seen=now,
            last_seen=now,
        )
        db_module.get_table().put_item(Item=d.to_item())
        devices.append(d)
    return devices


def _make_delete_event(user_id: str = USER_ID) -> dict:
    return make_event(method="DELETE", user_id=user_id)


def _mock_cognito_client():
    """Return a MagicMock that simulates cognito-idp with no exceptions."""
    mock = MagicMock()
    mock.exceptions.UserNotFoundException = type("UserNotFoundException", (Exception,), {})
    return mock


# ---------------------------------------------------------------------------
# Existing GET / PATCH tests
# ---------------------------------------------------------------------------


def test_get_profile_not_found(ddb_table):
    event = make_event(method="GET")
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 404


def test_get_profile_found(ddb_table):
    _seed_profile()
    event = make_event(method="GET")
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["profile"]["email"] == USER_EMAIL
    assert body["profile"]["user_id"] == USER_ID


def test_patch_profile_email(ddb_table):
    _seed_profile()
    event = make_event(method="PATCH", body={"email": "new@example.com"})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["profile"]["email"] == "new@example.com"


def test_patch_profile_unknown_fields_ignored(ddb_table):
    _seed_profile()
    event = make_event(method="PATCH", body={"email": "new@example.com", "unknown_field": "ignored"})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert "unknown_field" not in body["profile"]


def test_patch_profile_not_found(ddb_table):
    event = make_event(method="PATCH", body={"email": "x@x.com"})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 404


def test_patch_profile_invalid_email(ddb_table):
    """Malformed email should be rejected with 400 before hitting DB."""
    _seed_profile()
    event = make_event(method="PATCH", body={"email": "not-an-email"})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400
    body = json.loads(resp["body"])
    assert body["error"] == "validation_failed"


# ---------------------------------------------------------------------------
# DELETE /profile tests
# ---------------------------------------------------------------------------


@patch("handlers.profile.boto3.client")
def test_delete_profile_removes_sessions(mock_boto_client, ddb_table):
    mock_boto_client.return_value = _mock_cognito_client()
    _seed_profile()
    _seed_sessions(count=5)

    # Confirm sessions exist before.
    assert len(db_module.get_sessions(USER_ID, limit=100)) == 5

    resp = handler(_make_delete_event(), FakeLambdaContext())
    assert resp["statusCode"] == 204

    # All sessions must be gone.
    assert len(db_module.get_sessions(USER_ID, limit=100)) == 0


@patch("handlers.profile.boto3.client")
def test_delete_profile_removes_devices(mock_boto_client, ddb_table):
    mock_boto_client.return_value = _mock_cognito_client()
    _seed_profile()
    _seed_devices(count=3)

    assert len(db_module.list_devices(USER_ID)) == 3

    resp = handler(_make_delete_event(), FakeLambdaContext())
    assert resp["statusCode"] == 204

    assert len(db_module.list_devices(USER_ID)) == 0


@patch("handlers.profile.boto3.client")
def test_delete_profile_removes_profile_item(mock_boto_client, ddb_table):
    mock_boto_client.return_value = _mock_cognito_client()
    _seed_profile()

    assert db_module.get_profile(USER_ID) is not None

    resp = handler(_make_delete_event(), FakeLambdaContext())
    assert resp["statusCode"] == 204

    assert db_module.get_profile(USER_ID) is None


@patch("handlers.profile.boto3.client")
def test_delete_profile_calls_cognito_admin_delete(mock_boto_client, ddb_table):
    fake_pool_id = "us-east-1_TESTPOOL"
    os.environ["USER_POOL_ID"] = fake_pool_id

    mock_cognito = _mock_cognito_client()
    mock_boto_client.return_value = mock_cognito

    _seed_profile()
    resp = handler(_make_delete_event(), FakeLambdaContext())
    assert resp["statusCode"] == 204

    mock_cognito.admin_delete_user.assert_called_once_with(
        UserPoolId=fake_pool_id,
        Username=USER_ID,
    )


@patch("handlers.profile.boto3.client")
def test_delete_profile_idempotent(mock_boto_client, ddb_table):
    """DELETE twice must both return 204 even when user data is already gone."""
    mock_boto_client.return_value = _mock_cognito_client()
    _seed_profile()
    _seed_sessions(count=2)

    resp1 = handler(_make_delete_event(), FakeLambdaContext())
    assert resp1["statusCode"] == 204

    resp2 = handler(_make_delete_event(), FakeLambdaContext())
    assert resp2["statusCode"] == 204


@patch("handlers.profile.boto3.client")
def test_delete_profile_only_deletes_own_user_data(mock_boto_client, ddb_table):
    """Erasing user A must leave user B's data intact."""
    mock_boto_client.return_value = _mock_cognito_client()

    # Seed both users.
    _seed_profile(USER_ID, USER_EMAIL)
    _seed_profile(OTHER_USER_ID, OTHER_USER_EMAIL)
    _seed_sessions(user_id=USER_ID, count=3)
    _seed_sessions(user_id=OTHER_USER_ID, count=2)
    _seed_devices(user_id=USER_ID, count=2)
    _seed_devices(user_id=OTHER_USER_ID, count=1)

    # Delete as user A.
    resp = handler(_make_delete_event(user_id=USER_ID), FakeLambdaContext())
    assert resp["statusCode"] == 204

    # User A's data is gone.
    assert db_module.get_profile(USER_ID) is None
    assert len(db_module.get_sessions(USER_ID, limit=100)) == 0
    assert len(db_module.list_devices(USER_ID)) == 0

    # User B's data is untouched.
    assert db_module.get_profile(OTHER_USER_ID) is not None
    assert len(db_module.get_sessions(OTHER_USER_ID, limit=100)) == 2
    assert len(db_module.list_devices(OTHER_USER_ID)) == 1


@patch("handlers.profile.boto3.client")
def test_delete_profile_audit_log_hashes_user_id(mock_boto_client, ddb_table, caplog):
    """The audit log must not contain the raw user_id — only its SHA-256 prefix.

    Powertools Logger emits a standard Python LogRecord in addition to its JSON
    stdout output. We inspect the LogRecord's extra fields directly: the raw
    user_id must not appear, and the hashed form must be present.
    """
    mock_boto_client.return_value = _mock_cognito_client()
    _seed_profile()

    expected_hash = hashlib.sha256(USER_ID.encode()).hexdigest()[:16]

    with caplog.at_level(logging.INFO, logger="deckd-profile"):
        resp = handler(_make_delete_event(), FakeLambdaContext())

    assert resp["statusCode"] == 204

    # Find the account_erased LogRecord.
    audit_records = [r for r in caplog.records if r.getMessage() == "account_erased"]
    assert audit_records, "account_erased log record not found in caplog"

    audit_record = audit_records[0]

    # The raw user_id must not appear in any attribute of the log record.
    record_repr = str(vars(audit_record))
    assert USER_ID not in record_repr, "Raw user_id leaked into log record"

    # The hashed form must be present as a structured field on the record.
    assert getattr(audit_record, "user_id_hash", None) == expected_hash, (
        f"Expected user_id_hash={expected_hash!r} on log record, "
        f"got {getattr(audit_record, 'user_id_hash', 'MISSING')!r}"
    )
