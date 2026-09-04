"""
Tests for the sync loop's per-account posting.

Fixes A6 from the conflict audit: each queued row goes out with its own
account's token, so Account A's rows can never post under Account B's token.
"""
from unittest.mock import MagicMock

import pytest

import session
import sync


class _Resp:
    def __init__(self, status_code: int):
        self.status_code = status_code


@pytest.fixture
def mock_post(monkeypatch):
    """Patch requests.post inside sync and record all invocations."""
    post = MagicMock(return_value=_Resp(201))
    monkeypatch.setattr(sync.requests, "post", post)
    return post


@pytest.fixture
def token_by_user(monkeypatch):
    """Return a deterministic token string per user_id (or raise on request)."""
    tokens: dict[str, str] = {}

    def fake_get_id_token(user_id):
        if user_id not in tokens:
            raise RuntimeError(f"no token for {user_id}")
        return tokens[user_id]

    monkeypatch.setattr(sync, "get_id_token", fake_get_id_token)
    return tokens


def _seed_closed_session(user_id: str, exe: str = "game.exe") -> str:
    sid = session.open_session(user_id, exe, exe.replace(".exe", ""))
    session.close_session(sid)
    return sid


# ---------- happy path ------------------------------------------------------

def test_no_pending_returns_zero(tmp_deckd, mock_post, token_by_user):
    ok, failed = sync.sync_sessions()
    assert (ok, failed) == (0, 0)
    mock_post.assert_not_called()


def test_single_account_posts_all_pending(tmp_deckd, mock_post, token_by_user):
    token_by_user["user-a"] = "tok-a"
    _seed_closed_session("user-a", "a1.exe")
    _seed_closed_session("user-a", "a2.exe")

    ok, failed = sync.sync_sessions()
    assert (ok, failed) == (2, 0)
    assert mock_post.call_count == 2
    for call in mock_post.call_args_list:
        assert call.kwargs["headers"]["Authorization"] == "Bearer tok-a"
    assert session.get_unsynced("user-a") == []


def test_two_accounts_use_separate_tokens(tmp_deckd, mock_post, token_by_user):
    """The core A6 test: each account's rows post with its own token."""
    token_by_user["user-a"] = "tok-a"
    token_by_user["user-b"] = "tok-b"
    _seed_closed_session("user-a", "a.exe")
    _seed_closed_session("user-b", "b.exe")

    ok, failed = sync.sync_sessions()
    assert (ok, failed) == (2, 0)

    tokens_used = {call.kwargs["headers"]["Authorization"] for call in mock_post.call_args_list}
    assert tokens_used == {"Bearer tok-a", "Bearer tok-b"}
    # Verify each token was used with its own account's payload
    for call in mock_post.call_args_list:
        payload = call.kwargs["json"]
        auth = call.kwargs["headers"]["Authorization"]
        expected_exe = "a.exe" if auth == "Bearer tok-a" else "b.exe"
        assert payload["game_exe"] == expected_exe


# ---------- failure isolation ----------------------------------------------

def test_missing_token_for_one_account_does_not_block_others(
    tmp_deckd, mock_post, token_by_user
):
    """If Account A can't be refreshed, Account B still syncs."""
    token_by_user["user-b"] = "tok-b"
    # No token registered for user-a → get_id_token raises for it
    _seed_closed_session("user-a")
    _seed_closed_session("user-b")

    ok, failed = sync.sync_sessions()
    assert ok == 1  # user-b succeeded
    assert failed == 1  # user-a's row stays queued
    assert len(session.get_unsynced("user-a")) == 1
    assert session.get_unsynced("user-b") == []


def test_non_2xx_response_leaves_row_queued(tmp_deckd, monkeypatch, token_by_user):
    token_by_user["user-a"] = "tok-a"
    _seed_closed_session("user-a")

    def failing_post(*_a, **_kw):
        return _Resp(500)
    monkeypatch.setattr(sync.requests, "post", failing_post)

    ok, failed = sync.sync_sessions()
    assert (ok, failed) == (0, 1)
    assert len(session.get_unsynced("user-a")) == 1


def test_network_exception_leaves_row_queued(tmp_deckd, monkeypatch, token_by_user):
    token_by_user["user-a"] = "tok-a"
    _seed_closed_session("user-a")

    def raising_post(*_a, **_kw):
        raise sync.requests.RequestException("boom")
    monkeypatch.setattr(sync.requests, "post", raising_post)

    ok, failed = sync.sync_sessions()
    assert (ok, failed) == (0, 1)
    assert len(session.get_unsynced("user-a")) == 1


# ---------- device attribution ---------------------------------------------

def test_every_post_carries_device_headers(tmp_deckd, mock_post, token_by_user):
    """X-Device-Id + X-Device-Name must ship on every request so the backend
    can auto-register the install and stamp the row with device attribution."""
    token_by_user["user-a"] = "tok-a"
    _seed_closed_session("user-a")

    sync.sync_sessions()
    call = mock_post.call_args_list[0]
    headers = call.kwargs["headers"]
    assert "X-Device-Id" in headers
    assert "X-Device-Name" in headers
    # UUID hex length is 32; with dashes it's 36. Either way it's non-empty.
    assert len(headers["X-Device-Id"]) >= 32
    assert headers["X-Device-Name"]  # not empty


def test_device_id_stable_across_calls(tmp_deckd, mock_post, token_by_user):
    """The same install must present the same device_id every request —
    otherwise the backend would auto-register a new device on every sync
    and the 50-device cap would trip in a matter of hours."""
    token_by_user["user-a"] = "tok-a"
    _seed_closed_session("user-a", "a1.exe")
    _seed_closed_session("user-a", "a2.exe")

    sync.sync_sessions()
    ids_seen = {call.kwargs["headers"]["X-Device-Id"] for call in mock_post.call_args_list}
    assert len(ids_seen) == 1


def test_403_leaves_row_queued_and_logs(tmp_deckd, monkeypatch, token_by_user, capsys):
    """Revoked device → 403. Row stays queued so an un-revoke picks it up;
    a clear message goes to stderr so the operator sees why sync is dead."""
    token_by_user["user-a"] = "tok-a"
    _seed_closed_session("user-a")

    def revoked_post(*_a, **_kw):
        return _Resp(403)
    monkeypatch.setattr(sync.requests, "post", revoked_post)

    ok, failed = sync.sync_sessions()
    assert (ok, failed) == (0, 1)
    assert len(session.get_unsynced("user-a")) == 1
    err = capsys.readouterr().err
    assert "revoked" in err.lower()


def test_429_leaves_row_queued_and_logs(tmp_deckd, monkeypatch, token_by_user, capsys):
    """Device-limit-exceeded → 429. Same policy as 403 — surface it and hold the row."""
    token_by_user["user-a"] = "tok-a"
    _seed_closed_session("user-a")

    def throttled_post(*_a, **_kw):
        return _Resp(429)
    monkeypatch.setattr(sync.requests, "post", throttled_post)

    ok, failed = sync.sync_sessions()
    assert (ok, failed) == (0, 1)
    assert len(session.get_unsynced("user-a")) == 1
    err = capsys.readouterr().err
    assert "throttled" in err.lower() or "429" in err
