"""
Tests for the watcher's guardrail branches (Phase 6 Gap A).

Uses a manual _poll trigger rather than the background thread — we call
the same detection logic in a controlled way by monkeypatching psutil +
games.get_tracked and asserting notify calls.
"""
from unittest.mock import MagicMock

import pytest

import watcher


class _FakeProc:
    def __init__(self, name):
        self._name = name
    def name(self):
        return self._name


@pytest.fixture(autouse=True)
def reset_watcher_state():
    """Every test starts with an empty _active map."""
    watcher._active.clear()
    yield
    watcher._active.clear()


@pytest.fixture
def mock_env(monkeypatch, tmp_deckd):
    """Wire psutil, games.get_tracked, session.open_session/close_session, and notifications."""
    procs: list[_FakeProc] = []
    monkeypatch.setattr(watcher.psutil, "process_iter",
                        lambda attrs=None: iter(procs))

    tracked = {"game.exe": "Cool Game"}
    monkeypatch.setattr(watcher, "get_tracked", lambda: tracked)

    open_mock = MagicMock(return_value="session-123")
    close_mock = MagicMock()
    monkeypatch.setattr(watcher, "open_session", open_mock)
    monkeypatch.setattr(watcher, "close_session", close_mock)

    notify_mock = MagicMock()
    for name in ("on_no_active_account", "on_active_account_revoked",
                 "on_session_opened", "on_orphan_exe_stopped"):
        monkeypatch.setattr(watcher.notifications, name, MagicMock())

    return {
        "procs": procs, "tracked": tracked,
        "open_session": open_mock, "close_session": close_mock,
        "notify": watcher.notifications,
    }


def _tick():
    """One pass of the poll loop's detection logic."""
    watcher._poll_once()  # exposed for tests; see Step 4 for the refactor


def _seed_store(accounts, active_user_id=None, revoked_user_ids=()):
    """Populate the token store used by watcher."""
    import token_store
    store = token_store.TokenStore()
    for uid, email in accounts:
        store.upsert(token_store.Account(
            user_id=uid, email=email, id_token="t", refresh_token="r",
            expires_at=1_700_000_000,
        ))
    if active_user_id:
        store.set_active(active_user_id)
    for uid in revoked_user_ids:
        store.mark_revoked(uid)
    token_store.write(store)


def test_no_accounts_stored_is_silent(mock_env):
    _seed_store([], active_user_id=None)
    mock_env["procs"].append(_FakeProc("game.exe"))
    _tick()
    mock_env["notify"].on_no_active_account.assert_not_called()
    mock_env["notify"].on_active_account_revoked.assert_not_called()
    mock_env["open_session"].assert_not_called()


def test_accounts_stored_but_none_active_fires_orphan_toast(mock_env):
    _seed_store([("u", "u@x.com")], active_user_id=None)
    mock_env["procs"].append(_FakeProc("game.exe"))
    _tick()
    mock_env["notify"].on_no_active_account.assert_called_once_with("game.exe", "Cool Game")
    mock_env["open_session"].assert_not_called()


def test_active_but_revoked_fires_revoked_toast(mock_env):
    _seed_store([("u", "u@x.com")], active_user_id="u", revoked_user_ids=("u",))
    mock_env["procs"].append(_FakeProc("game.exe"))
    _tick()
    mock_env["notify"].on_active_account_revoked.assert_called_once_with(
        "game.exe", "Cool Game", "u@x.com")
    mock_env["notify"].on_no_active_account.assert_not_called()
    mock_env["open_session"].assert_not_called()


def test_healthy_account_opens_session_and_notifies(mock_env):
    _seed_store([("u", "u@x.com")], active_user_id="u")
    mock_env["procs"].append(_FakeProc("game.exe"))
    _tick()
    mock_env["open_session"].assert_called_once_with("u", "game.exe", "Cool Game")
    mock_env["notify"].on_session_opened.assert_called_once()
    assert watcher._active == {"game.exe": "session-123"}


def test_stop_branch_calls_orphan_stopped_and_closes(mock_env):
    _seed_store([("u", "u@x.com")], active_user_id="u")
    mock_env["procs"].append(_FakeProc("game.exe"))
    _tick()  # opens the session
    assert watcher._active == {"game.exe": "session-123"}

    mock_env["procs"].clear()  # game exits
    _tick()
    mock_env["close_session"].assert_called_once_with("session-123")
    mock_env["notify"].on_orphan_exe_stopped.assert_called_once_with("game.exe")
    assert watcher._active == {}


def test_list_open_sessions_returns_exe_and_name(mock_env):
    _seed_store([("u", "u@x.com")], active_user_id="u")
    mock_env["procs"].append(_FakeProc("game.exe"))
    _tick()
    assert watcher.list_open_sessions() == [("game.exe", "Cool Game")]


def test_list_open_sessions_falls_back_to_exe_when_name_missing(mock_env):
    _seed_store([("u", "u@x.com")], active_user_id="u")
    mock_env["procs"].append(_FakeProc("game.exe"))
    _tick()
    # Simulate the tracked list dropping the exe between _tick and the query.
    mock_env["tracked"].clear()
    assert watcher.list_open_sessions() == [("game.exe", "game.exe")]
