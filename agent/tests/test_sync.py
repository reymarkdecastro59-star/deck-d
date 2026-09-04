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
