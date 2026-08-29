import pytest
from shared.models import Session, UserProfile
import shared.db as db_module


def _session(session_id="s1", started_at=1_700_000_000) -> Session:
    return Session(
        user_id="u1",
        session_id=session_id,
        game_exe="game.exe",
        game_name="My Game",
        started_at=started_at,
        ended_at=started_at + 3600,
        duration_sec=3600,
        label="tracked",
    )


def test_put_and_get_sessions(ddb_table):
    s = _session()
    db_module.put_session(s)
    results = db_module.get_sessions("u1")
    assert len(results) == 1
    assert results[0].session_id == "s1"


def test_get_sessions_empty(ddb_table):
    assert db_module.get_sessions("nobody") == []


def test_delete_session_found(ddb_table):
    s = _session()
    db_module.put_session(s)
    deleted = db_module.delete_session("u1", "s1")
    assert deleted is True
    assert db_module.get_sessions("u1") == []


def test_delete_session_not_found(ddb_table):
    deleted = db_module.delete_session("u1", "nonexistent")
    assert deleted is False


def test_update_session_label(ddb_table):
    s = _session()
    db_module.put_session(s)
    updated = db_module.update_session_label("u1", "s1", "focus")
    assert updated is not None
    assert updated.label == "focus"
    assert updated.session_id == "s1"


def test_update_session_label_not_found(ddb_table):
    result = db_module.update_session_label("u1", "ghost", "focus")
    assert result is None


def test_get_or_create_profile_creates(ddb_table):
    profile = db_module.get_or_create_profile("u1", "u1@test.com")
    assert profile.user_id == "u1"
    assert profile.email == "u1@test.com"


def test_get_or_create_profile_existing(ddb_table):
    db_module.get_or_create_profile("u1", "u1@test.com")
    profile2 = db_module.get_or_create_profile("u1", "other@test.com")
    assert profile2.email == "u1@test.com"  # original not overwritten


def test_get_profile_not_found(ddb_table):
    assert db_module.get_profile("nobody") is None


def test_update_profile(ddb_table):
    db_module.get_or_create_profile("u1", "orig@test.com")
    updated = db_module.update_profile("u1", email="new@test.com")
    assert updated is not None
    assert updated.email == "new@test.com"


def test_update_profile_not_found(ddb_table):
    result = db_module.update_profile("ghost", email="x@x.com")
    assert result is None
