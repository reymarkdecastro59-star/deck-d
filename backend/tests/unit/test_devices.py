"""Tests for the /devices handler — GET list, PATCH rename, DELETE revoke."""
import json

import pytest

import shared.db as db_module
from handlers.devices import handler
from tests.unit.conftest import make_event, USER_ID, FakeLambdaContext


def test_list_empty(ddb_table):
    resp = handler(make_event(method="GET"), FakeLambdaContext())
    assert resp["statusCode"] == 200
    assert json.loads(resp["body"]) == {"devices": []}


def test_list_returns_registered_devices(ddb_table):
    db_module.touch_device(USER_ID, "dev-1", "Living Room")
    db_module.touch_device(USER_ID, "dev-2", "Laptop")
    resp = handler(make_event(method="GET"), FakeLambdaContext())
    body = json.loads(resp["body"])
    names = {d["device_name"] for d in body["devices"]}
    assert names == {"Living Room", "Laptop"}


def test_list_isolates_by_user(ddb_table):
    db_module.touch_device(USER_ID, "dev-1", "Mine")
    db_module.touch_device("other-user", "dev-1", "Theirs")
    resp = handler(make_event(method="GET"), FakeLambdaContext())
    body = json.loads(resp["body"])
    assert len(body["devices"]) == 1
    assert body["devices"][0]["device_name"] == "Mine"


def test_patch_rename_success(ddb_table):
    db_module.touch_device(USER_ID, "dev-1", "Home")
    event = make_event(
        method="PATCH",
        path_params={"device_id": "dev-1"},
        body={"device_name": "Office"},
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 200
    assert json.loads(resp["body"])["device"]["device_name"] == "Office"


def test_patch_missing_device_returns_404(ddb_table):
    event = make_event(
        method="PATCH",
        path_params={"device_id": "ghost"},
        body={"device_name": "Office"},
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 404


def test_patch_empty_name_rejected(ddb_table):
    db_module.touch_device(USER_ID, "dev-1", "Home")
    event = make_event(
        method="PATCH",
        path_params={"device_id": "dev-1"},
        body={"device_name": ""},
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400


def test_patch_name_too_long_rejected(ddb_table):
    db_module.touch_device(USER_ID, "dev-1", "Home")
    event = make_event(
        method="PATCH",
        path_params={"device_id": "dev-1"},
        body={"device_name": "x" * 65},
    )
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400


def test_delete_revokes_device(ddb_table):
    db_module.touch_device(USER_ID, "dev-1", "Home")
    resp = handler(
        make_event(method="DELETE", path_params={"device_id": "dev-1"}),
        FakeLambdaContext(),
    )
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["device"]["revoked_at"] is not None
    # Verify persistence
    stored = db_module.get_device(USER_ID, "dev-1")
    assert stored.is_revoked


def test_delete_missing_returns_404(ddb_table):
    resp = handler(
        make_event(method="DELETE", path_params={"device_id": "ghost"}),
        FakeLambdaContext(),
    )
    assert resp["statusCode"] == 404


def test_unsupported_method_returns_405(ddb_table):
    resp = handler(make_event(method="POST"), FakeLambdaContext())
    assert resp["statusCode"] == 405


# ---------------------------------------------------------------------------
# POST /devices/heartbeat — the agent checks in every sync tick so a signed-in
# tracker shows as connected before any game is played (was invisible until
# the first session upload, so the web said "No tracker yet").
# ---------------------------------------------------------------------------

def _heartbeat(device_id="dev-hb", device_name="Gaming PC", extra_headers=None):
    headers = {}
    if device_id is not None:
        headers["X-Device-Id"] = device_id
    if device_name is not None:
        headers["X-Device-Name"] = device_name
    headers.update(extra_headers or {})
    event = make_event(method="POST", resource="/devices/heartbeat", headers=headers)
    return handler(event, FakeLambdaContext())


def test_heartbeat_registers_device(ddb_table):
    resp = _heartbeat()
    assert resp["statusCode"] == 200
    assert json.loads(resp["body"])["device"]["device_name"] == "Gaming PC"
    listed = json.loads(handler(make_event(method="GET"), FakeLambdaContext())["body"])["devices"]
    assert [d["device_name"] for d in listed] == ["Gaming PC"]
    assert listed[0]["last_seen"] > 0


def test_heartbeat_creates_profile(ddb_table):
    _heartbeat()
    assert db_module.get_profile(USER_ID) is not None


def test_heartbeat_header_names_case_insensitive(ddb_table):
    resp = _heartbeat(device_id=None, device_name=None,
                      extra_headers={"x-device-id": "dev-lower", "x-device-name": "Lower"})
    assert resp["statusCode"] == 200


def test_heartbeat_requires_device_id(ddb_table):
    resp = _heartbeat(device_id=None)
    assert resp["statusCode"] == 400


def test_heartbeat_from_revoked_device_returns_403(ddb_table):
    db_module.touch_device(USER_ID, "dev-hb", "Gaming PC")
    db_module.revoke_device(USER_ID, "dev-hb")
    resp = _heartbeat()
    assert resp["statusCode"] == 403
    assert json.loads(resp["body"]) == {"error": "device_revoked"}


def test_heartbeat_over_device_limit_returns_429(ddb_table, monkeypatch):
    monkeypatch.setattr(db_module, "MAX_DEVICES_PER_USER", 1)
    db_module.touch_device(USER_ID, "dev-existing", "Old PC")
    resp = _heartbeat(device_id="dev-new")
    assert resp["statusCode"] == 429
