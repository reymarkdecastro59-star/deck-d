"""
Tests for the winotify wrapper. Mocks winotify.Notification so tests run
cross-platform. The dedup state is module-level so each test resets it.
"""
from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture(autouse=True)
def reset_notifications_state():
    """Every test starts with clean dedup sets."""
    import notifications
    notifications._notified_session_users.clear()
    notifications._notified_orphan_exes.clear()
    yield


@pytest.fixture
def mock_notification(monkeypatch):
    """Patch winotify.Notification so no real toast fires. Returns the mock class."""
    import notifications
    mock_cls = MagicMock()
    monkeypatch.setattr(notifications, "Notification", mock_cls)
    return mock_cls


def _account(user_id="user-1", email="a@x.com"):
    import token_store
    return token_store.Account(
        user_id=user_id, email=email,
        id_token="t", refresh_token="r", expires_at=1_700_000_000,
    )


# ---------- session-start dedup ---------------------------------------------

def test_session_opened_fires_once_per_user(mock_notification):
    import notifications
    acct = _account()
    notifications.on_session_opened("g.exe", "Game", acct)
    notifications.on_session_opened("g.exe", "Game", acct)
    assert mock_notification.call_count == 1


def test_session_opened_fires_again_after_reset_session_dedup(mock_notification):
    import notifications
    acct = _account()
    notifications.on_session_opened("g.exe", "Game", acct)
    notifications.reset_session_dedup()
    notifications.on_session_opened("g.exe", "Game", acct)
    assert mock_notification.call_count == 2


def test_session_opened_fires_per_distinct_user(mock_notification):
    import notifications
    notifications.on_session_opened("g.exe", "Game", _account("user-a", "a@x.com"))
    notifications.on_session_opened("g.exe", "Game", _account("user-b", "b@x.com"))
    assert mock_notification.call_count == 2


# ---------- orphan dedup ----------------------------------------------------

def test_no_active_account_dedups_per_exe(mock_notification):
    import notifications
    notifications.on_no_active_account("g.exe", "Game")
    notifications.on_no_active_account("g.exe", "Game")
    assert mock_notification.call_count == 1


def test_no_active_account_refires_after_exe_stopped(mock_notification):
    import notifications
    notifications.on_no_active_account("g.exe", "Game")
    notifications.on_orphan_exe_stopped("g.exe")
    notifications.on_no_active_account("g.exe", "Game")
    assert mock_notification.call_count == 2


def test_no_active_account_distinct_exes_both_fire(mock_notification):
    import notifications
    notifications.on_no_active_account("g1.exe", "Game 1")
    notifications.on_no_active_account("g2.exe", "Game 2")
    assert mock_notification.call_count == 2


def test_active_account_revoked_dedups_per_exe(mock_notification):
    import notifications
    notifications.on_active_account_revoked("g.exe", "Game", "a@x.com")
    notifications.on_active_account_revoked("g.exe", "Game", "a@x.com")
    assert mock_notification.call_count == 1


def test_orphan_exe_stopped_clears_both_orphan_and_revoked_dedup(mock_notification):
    """Both A-gap toasts share the orphan-exe dedup set."""
    import notifications
    notifications.on_no_active_account("g1.exe", "G1")
    notifications.on_active_account_revoked("g2.exe", "G2", "a@x.com")
    notifications.on_orphan_exe_stopped("g1.exe")
    notifications.on_orphan_exe_stopped("g2.exe")
    notifications.on_no_active_account("g1.exe", "G1")
    notifications.on_active_account_revoked("g2.exe", "G2", "a@x.com")
    assert mock_notification.call_count == 4


# ---------- device-revoked (no dedup) ---------------------------------------

def test_device_revoked_by_backend_no_dedup(mock_notification):
    """Fires every call — sync layer is responsible for not re-calling."""
    import notifications
    notifications.on_device_revoked_by_backend("a@x.com")
    notifications.on_device_revoked_by_backend("a@x.com")
    assert mock_notification.call_count == 2


# ---------- toast payload content (smoke) -----------------------------------

def test_toast_uses_correct_app_id(mock_notification):
    import notifications
    notifications.on_no_active_account("g.exe", "Game")
    kwargs = mock_notification.call_args.kwargs
    assert kwargs["app_id"] == "DECK'D"


def test_no_active_account_toast_mentions_game_name(mock_notification):
    import notifications
    notifications.on_no_active_account("g.exe", "Cool Game")
    body = mock_notification.call_args.kwargs["msg"]
    assert "Cool Game" in body


def test_active_account_revoked_toast_mentions_email(mock_notification):
    import notifications
    notifications.on_active_account_revoked("g.exe", "Game", "user@example.com")
    body = mock_notification.call_args.kwargs["msg"]
    assert "user@example.com" in body
