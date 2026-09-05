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
    can auto-register the install and stamp the row with device attribution.
    This test is intentionally an integration test — it lets the real
    token_store generate a UUID into the tmp_deckd fixture path so a
    future device_id-format change breaks here."""
    import uuid as _uuid
    token_by_user["user-a"] = "tok-a"
    _seed_closed_session("user-a")

    sync.sync_sessions()
    call = mock_post.call_args_list[0]
    headers = call.kwargs["headers"]
    # UUID.__init__ raises ValueError on malformed input — enforce backend contract.
    _uuid.UUID(headers["X-Device-Id"])
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


def test_403_leaves_rows_queued_and_logs_once(tmp_deckd, monkeypatch, token_by_user, capsys):
    """Revoked device → 403. Rows stay queued so an un-revoke picks them up.
    Critical: log fires EXACTLY once per account per tick even with N queued
    rows. Otherwise a device with 20 queued rows spams 20 identical lines
    every sync tick, forever."""
    token_by_user["user-a"] = "tok-a"
    for i in range(5):
        _seed_closed_session("user-a", f"g{i}.exe")

    def revoked_post(*_a, **_kw):
        return _Resp(403)
    monkeypatch.setattr(sync.requests, "post", revoked_post)

    ok, failed = sync.sync_sessions()
    assert ok == 0
    assert failed == 5
    assert len(session.get_unsynced("user-a")) == 5
    err = capsys.readouterr().err
    # Exactly one 403 line, not five
    assert err.count("403") == 1
    assert "revoked" in err.lower()


def test_403_only_hits_backend_once_per_tick(tmp_deckd, monkeypatch, token_by_user):
    """After the first 403 for a user, the loop must break — subsequent rows
    for that account are not re-attempted this tick. Saves N-1 wasted HTTP
    round-trips per revoked account with a full queue."""
    token_by_user["user-a"] = "tok-a"
    for i in range(5):
        _seed_closed_session("user-a", f"g{i}.exe")

    calls: list = []
    def counting_post(*_a, **kw):
        calls.append(kw)
        return _Resp(403)
    monkeypatch.setattr(sync.requests, "post", counting_post)

    sync.sync_sessions()
    assert len(calls) == 1


def test_429_leaves_row_queued_and_logs(tmp_deckd, monkeypatch, token_by_user, capsys):
    """Device-limit-exceeded → 429. Same policy as 403 — surface once and hold rows."""
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


def test_401_leaves_row_queued_and_logs(tmp_deckd, monkeypatch, token_by_user, capsys):
    """Token rejected → 401. Same policy — log once, hold rows, break the loop.
    Fixes the 'auth failure silently swallowed as generic transient' gap."""
    token_by_user["user-a"] = "tok-a"
    _seed_closed_session("user-a")

    def unauthorized_post(*_a, **_kw):
        return _Resp(401)
    monkeypatch.setattr(sync.requests, "post", unauthorized_post)

    ok, failed = sync.sync_sessions()
    assert (ok, failed) == (0, 1)
    assert len(session.get_unsynced("user-a")) == 1
    err = capsys.readouterr().err
    assert "401" in err
    assert "re-login" in err.lower() or "re-log" in err.lower()


def test_403_does_not_leak_full_user_id_in_logs(tmp_deckd, monkeypatch, token_by_user, capsys):
    """user_id (Cognito sub UUID) must be truncated in operator-visible logs,
    consistent with how device_id is truncated. Belt-and-braces for the case
    where the tray log gets shipped to a central collector."""
    long_user_id = "a" * 32  # 32-char user_id
    token_by_user[long_user_id] = "tok"
    _seed_closed_session(long_user_id)

    monkeypatch.setattr(sync.requests, "post", lambda *_a, **_kw: _Resp(403))
    sync.sync_sessions()
    err = capsys.readouterr().err
    # Full 32-char user_id must NOT appear anywhere in the log
    assert long_user_id not in err
    # But the truncated prefix should
    assert long_user_id[:8] in err


# ---------- Phase 5: backoff + auth_failed + dead-letter -------------------

def test_500_arms_exponential_backoff(tmp_deckd, monkeypatch, token_by_user):
    """After a 5xx, is_backoff_expired must be False for the base delay."""
    token_by_user["user-a"] = "tok"
    _seed_closed_session("user-a")
    monkeypatch.setattr(sync.requests, "post", lambda *_a, **_kw: _Resp(500))

    sync.sync_sessions()
    state = session.get_sync_state("user-a")
    assert state["failure_count"] == 1
    assert state["next_retry_at"] > 0


def test_backoff_skips_next_tick(tmp_deckd, monkeypatch, token_by_user):
    """A user still in backoff is skipped entirely — no HTTP call issued."""
    token_by_user["user-a"] = "tok"
    _seed_closed_session("user-a")
    # Prime the backoff so it's far in the future
    session.record_sync_failure("user-a", now=int(sync.time.time()), backoff_sec=3600)

    post_calls: list = []
    monkeypatch.setattr(sync.requests, "post",
                        lambda *a, **kw: post_calls.append(kw) or _Resp(201))

    ok, failed = sync.sync_sessions()
    assert (ok, failed) == (0, 0)
    assert post_calls == []


def test_success_clears_backoff(tmp_deckd, mock_post, token_by_user):
    """A tick that syncs cleanly must wipe any prior failure state."""
    token_by_user["user-a"] = "tok"
    _seed_closed_session("user-a")
    session.record_sync_failure("user-a", now=0, backoff_sec=1)  # expired immediately

    sync.sync_sessions()
    state = session.get_sync_state("user-a")
    assert state["failure_count"] == 0


def test_401_sets_auth_failed_and_blocks_further_ticks(
    tmp_deckd, monkeypatch, token_by_user
):
    """After 401, the user stays skipped even without waiting for backoff."""
    token_by_user["user-a"] = "tok"
    _seed_closed_session("user-a")

    monkeypatch.setattr(sync.requests, "post", lambda *_a, **_kw: _Resp(401))
    sync.sync_sessions()
    state = session.get_sync_state("user-a")
    assert state["auth_failed"] == 1

    # Second tick: even with a fresh post mock, no call is made
    calls: list = []
    monkeypatch.setattr(sync.requests, "post",
                        lambda *a, **kw: calls.append(kw) or _Resp(201))
    sync.sync_sessions()
    assert calls == []


def test_dead_letter_after_24h_of_failures(tmp_deckd, monkeypatch, token_by_user):
    """Rows that have been stuck for 24h+ get tombstoned so they stop
    occupying retry budget forever."""
    token_by_user["user-a"] = "tok"
    _seed_closed_session("user-a")
    _seed_closed_session("user-a")
    assert len(session.get_unsynced("user-a")) == 2

    # Simulate: first failure was 25 hours ago
    ancient = int(sync.time.time()) - 25 * 3600
    session.record_sync_failure("user-a", now=ancient, backoff_sec=0)

    # Even with a post mock that would succeed, the dead-letter branch
    # fires first and the rows are tombstoned before HTTP.
    post_calls: list = []
    monkeypatch.setattr(sync.requests, "post",
                        lambda *a, **kw: post_calls.append(kw) or _Resp(201))
    sync.sync_sessions()

    assert session.get_unsynced("user-a") == []
    assert session.get_dead_letter_count("user-a") == 2
    assert post_calls == []


def test_dead_letter_survives_via_get_dead_letter_count(tmp_deckd):
    """The row is preserved in the DB for audit — get_dead_letter_count
    is the surfaced counter (main.py puts it in the tray tooltip)."""
    sid = session.open_session("user-a", "g.exe", "G")
    session.close_session(sid)
    session.dead_letter_pending("user-a")
    assert session.get_dead_letter_count() == 1


# ---------- Gap C: device revocation (Phase 6) ------------------------------

class _JsonResp:
    """Response with a .json() method for the 403 device_revoked branch."""
    def __init__(self, status_code: int, body: dict | None = None, raw: str | None = None):
        self.status_code = status_code
        self._body = body
        self._raw = raw

    def json(self):
        if self._body is not None:
            return self._body
        if self._raw is not None:
            import json as _json
            return _json.loads(self._raw)  # raises ValueError for malformed
        raise ValueError("no body")


@pytest.fixture
def mock_notify(monkeypatch):
    """Patch the notifications functions sync imports."""
    from unittest.mock import MagicMock
    mock = MagicMock()
    monkeypatch.setattr(sync.notifications, "on_device_revoked_by_backend", mock)
    return mock


def test_revoked_account_is_skipped_from_pending(tmp_deckd, mock_post, token_by_user):
    import token_store
    token_by_user["user-a"] = "tok-a"
    _seed_closed_session("user-a", "a.exe")

    store = token_store.read()
    store.upsert(token_store.Account(
        user_id="user-a", email="a@x.com",
        id_token="t", refresh_token="r", expires_at=1_700_000_000,
    ))
    store.mark_revoked("user-a")
    token_store.write(store)

    ok, failed = sync.sync_sessions()
    assert (ok, failed) == (0, 0)
    mock_post.assert_not_called()


def test_403_device_revoked_marks_account_and_notifies(tmp_deckd, monkeypatch, token_by_user, mock_notify):
    import token_store
    from unittest.mock import MagicMock

    token_by_user["user-a"] = "tok-a"
    _seed_closed_session("user-a", "a.exe")
    store = token_store.read()
    store.upsert(token_store.Account(
        user_id="user-a", email="a@x.com",
        id_token="t", refresh_token="r", expires_at=1_700_000_000,
    ))
    token_store.write(store)

    post = MagicMock(return_value=_JsonResp(403, body={"error": "device_revoked"}))
    monkeypatch.setattr(sync.requests, "post", post)

    ok, failed = sync.sync_sessions()
    assert ok == 0
    assert failed >= 1

    reloaded = token_store.read()
    assert reloaded.is_revoked("user-a") is True

    mock_notify.assert_called_once()
    assert "a@x.com" in mock_notify.call_args.args[0]


def test_generic_403_does_not_mark_revoked(tmp_deckd, monkeypatch, token_by_user, mock_notify):
    """A 403 whose body is not {'error': 'device_revoked'} falls through to generic terminal log."""
    import token_store
    from unittest.mock import MagicMock

    token_by_user["user-a"] = "tok-a"
    _seed_closed_session("user-a", "a.exe")
    store = token_store.read()
    store.upsert(token_store.Account(
        user_id="user-a", email="a@x.com",
        id_token="t", refresh_token="r", expires_at=1_700_000_000,
    ))
    token_store.write(store)

    post = MagicMock(return_value=_JsonResp(403, body={"error": "other_thing"}))
    monkeypatch.setattr(sync.requests, "post", post)

    ok, failed = sync.sync_sessions()
    assert ok == 0

    reloaded = token_store.read()
    assert reloaded.is_revoked("user-a") is False
    mock_notify.assert_not_called()


def test_403_with_no_json_body_does_not_crash(tmp_deckd, monkeypatch, token_by_user, mock_notify):
    import token_store
    from unittest.mock import MagicMock

    token_by_user["user-a"] = "tok-a"
    _seed_closed_session("user-a", "a.exe")
    store = token_store.read()
    store.upsert(token_store.Account(
        user_id="user-a", email="a@x.com",
        id_token="t", refresh_token="r", expires_at=1_700_000_000,
    ))
    token_store.write(store)

    class _BadResp:
        status_code = 403
        def json(self):
            raise ValueError("not JSON")

    post = MagicMock(return_value=_BadResp())
    monkeypatch.setattr(sync.requests, "post", post)

    ok, failed = sync.sync_sessions()  # must not raise
    reloaded = token_store.read()
    assert reloaded.is_revoked("user-a") is False
    mock_notify.assert_not_called()


def test_401_and_429_behaviour_unchanged(tmp_deckd, monkeypatch, token_by_user, mock_notify):
    """Regression guard: the 401/429 branch must not touch revocation state."""
    import token_store
    from unittest.mock import MagicMock

    token_by_user["user-a"] = "tok-a"
    _seed_closed_session("user-a", "a.exe")
    store = token_store.read()
    store.upsert(token_store.Account(
        user_id="user-a", email="a@x.com",
        id_token="t", refresh_token="r", expires_at=1_700_000_000,
    ))
    token_store.write(store)

    for code in (401, 429):
        post = MagicMock(return_value=_Resp(code))
        monkeypatch.setattr(sync.requests, "post", post)
        sync.sync_sessions()
        reloaded = token_store.read()
        assert reloaded.is_revoked("user-a") is False
    mock_notify.assert_not_called()


def test_403_device_revoked_when_account_already_logged_out_does_not_notify(
    tmp_deckd, monkeypatch, token_by_user, mock_notify
):
    """Race: sync gets 403 device_revoked, but the account was logged out
    between our read and now. mark_revoked raises TokenStoreError; we must
    not fire a toast against a truncated user_id fallback."""
    from unittest.mock import MagicMock

    token_by_user["user-a"] = "tok-a"
    _seed_closed_session("user-a", "a.exe")
    # Deliberately DO NOT upsert an Account for user-a; token_by_user only
    # feeds get_id_token, not the token_store. mark_revoked will raise
    # TokenStoreError.

    post = MagicMock(return_value=_JsonResp(403, body={"error": "device_revoked"}))
    monkeypatch.setattr(sync.requests, "post", post)

    ok, failed = sync.sync_sessions()
    assert ok == 0
    assert failed >= 1
    mock_notify.assert_not_called()
