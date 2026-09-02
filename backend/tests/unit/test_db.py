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


# ---------------------------------------------------------------------------
# get_sessions_in_range
# ---------------------------------------------------------------------------

def _session_at(session_id: str, started_at: int) -> Session:
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


def test_get_sessions_in_range_filters_by_time(ddb_table):
    db_module.put_session(_session_at("early", 1_700_000_000))
    db_module.put_session(_session_at("middle", 1_700_010_000))
    db_module.put_session(_session_at("late", 1_700_020_000))

    results = db_module.get_sessions_in_range("u1", 1_700_005_000, 1_700_015_000)
    assert len(results) == 1
    assert results[0].session_id == "middle"


def test_get_sessions_in_range_inclusive_bounds(ddb_table):
    db_module.put_session(_session_at("at-from", 1_700_000_000))
    db_module.put_session(_session_at("between", 1_700_010_000))
    db_module.put_session(_session_at("at-to", 1_700_020_000))

    results = db_module.get_sessions_in_range("u1", 1_700_000_000, 1_700_020_000)
    session_ids = {r.session_id for r in results}
    assert session_ids == {"at-from", "between", "at-to"}


def test_get_sessions_in_range_empty(ddb_table):
    db_module.put_session(_session_at("s1", 1_700_000_000))

    results = db_module.get_sessions_in_range("u1", 1_700_100_000, 1_700_200_000)
    assert results == []


# ---------------------------------------------------------------------------
# iter_all_sessions — pagination test
# ---------------------------------------------------------------------------

def test_iter_all_sessions_paginates(ddb_table):
    """Seed 150 sessions (exceeds any single DDB page); iter_all_sessions must return all 150."""
    base_ts = 1_700_000_000
    for i in range(150):
        db_module.put_session(_session_at(f"s{i}", base_ts + i))

    results = db_module.iter_all_sessions("u1")
    assert len(results) == 150
    # Results should be newest-first (ScanIndexForward=False)
    assert results[0].started_at >= results[-1].started_at
