import json
import pytest
import shared.db as db_module
from handlers.profile import handler
from tests.unit.conftest import make_event, USER_ID, USER_EMAIL


def _seed_profile():
    db_module.get_or_create_profile(USER_ID, USER_EMAIL)


def test_get_profile_not_found(ddb_table):
    event = make_event(method="GET")
    resp = handler(event, None)
    assert resp["statusCode"] == 404


def test_get_profile_found(ddb_table):
    _seed_profile()
    event = make_event(method="GET")
    resp = handler(event, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["profile"]["email"] == USER_EMAIL
    assert body["profile"]["user_id"] == USER_ID


def test_patch_profile_email(ddb_table):
    _seed_profile()
    event = make_event(method="PATCH", body={"email": "new@example.com"})
    resp = handler(event, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["profile"]["email"] == "new@example.com"


def test_patch_profile_unknown_fields_ignored(ddb_table):
    _seed_profile()
    event = make_event(method="PATCH", body={"email": "new@example.com", "unknown_field": "ignored"})
    resp = handler(event, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert "unknown_field" not in body["profile"]


def test_patch_profile_not_found(ddb_table):
    event = make_event(method="PATCH", body={"email": "x@x.com"})
    resp = handler(event, None)
    assert resp["statusCode"] == 404
