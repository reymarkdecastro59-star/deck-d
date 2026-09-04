"""Tests for the per-user device registry CRUD in shared/db.py."""
import time

import pytest

import shared.db as db_module
from shared.models import Device
from tests.unit.conftest import USER_ID


def test_get_missing_device_returns_none(ddb_table):
    assert db_module.get_device(USER_ID, "no-such-device") is None


def test_list_devices_empty(ddb_table):
    assert db_module.list_devices(USER_ID) == []


def test_touch_device_creates_when_missing(ddb_table):
    device = db_module.touch_device(USER_ID, "dev-1", "Living Room PC")
    assert device.device_id == "dev-1"
    assert device.device_name == "Living Room PC"
    assert device.first_seen == device.last_seen
    assert not device.is_revoked


def test_touch_device_bumps_last_seen_on_repeat(ddb_table):
    first = db_module.touch_device(USER_ID, "dev-1", "PC")
    time.sleep(1)  # ensure a distinct epoch second
    second = db_module.touch_device(USER_ID, "dev-1", "PC")
    assert second.first_seen == first.first_seen  # preserved
    assert second.last_seen >= first.last_seen + 1


def test_touch_device_updates_name_when_changed(ddb_table):
    db_module.touch_device(USER_ID, "dev-1", "Old Name")
    updated = db_module.touch_device(USER_ID, "dev-1", "New Name")
    assert updated.device_name == "New Name"


def test_touch_device_preserves_name_when_empty_string_passed(ddb_table):
    db_module.touch_device(USER_ID, "dev-1", "Original")
    updated = db_module.touch_device(USER_ID, "dev-1", "")
    assert updated.device_name == "Original"


def test_rename_device_missing_returns_none(ddb_table):
    assert db_module.rename_device(USER_ID, "ghost", "New") is None


def test_rename_device_updates_name(ddb_table):
    db_module.touch_device(USER_ID, "dev-1", "Home")
    renamed = db_module.rename_device(USER_ID, "dev-1", "Work")
    assert renamed.device_name == "Work"
    reloaded = db_module.get_device(USER_ID, "dev-1")
    assert reloaded.device_name == "Work"


def test_revoke_device_sets_revoked_at(ddb_table):
    db_module.touch_device(USER_ID, "dev-1", "Home")
    revoked = db_module.revoke_device(USER_ID, "dev-1")
    assert revoked.is_revoked
    assert revoked.revoked_at is not None


def test_revoke_missing_device_returns_none(ddb_table):
    assert db_module.revoke_device(USER_ID, "ghost") is None


def test_touch_after_revoke_returns_revoked_device(ddb_table):
    """Auto-registration must not resurrect a revoked device."""
    db_module.touch_device(USER_ID, "dev-1", "Home")
    db_module.revoke_device(USER_ID, "dev-1")
    still_revoked = db_module.touch_device(USER_ID, "dev-1", "Home")
    assert still_revoked.is_revoked


def test_list_devices_only_returns_this_user(ddb_table):
    db_module.touch_device(USER_ID, "dev-1", "Mine")
    db_module.touch_device("other-user", "dev-1", "Theirs")
    mine = db_module.list_devices(USER_ID)
    assert len(mine) == 1
    assert mine[0].device_name == "Mine"


def test_device_from_item_roundtrip(ddb_table):
    original = Device(
        user_id=USER_ID, device_id="dev-1", device_name="Test",
        first_seen=1000, last_seen=2000, revoked_at=1500,
    )
    item = original.to_item()
    reloaded = Device.from_item(item)
    assert reloaded == original
