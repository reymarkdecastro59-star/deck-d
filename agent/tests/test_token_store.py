"""Tests for the encrypted multi-account token store."""
import base64
import json
import os

import pytest

import token_store


def _account(user_id="user-1", email="one@example.com", expires_at=1_700_000_000):
    return token_store.Account(
        user_id=user_id,
        email=email,
        id_token="id-token-value",
        refresh_token="refresh-token-value",
        expires_at=expires_at,
    )


def _fake_id_token(sub: str = "abc-123", email: str = "e@x.com") -> str:
    """Build a JWT-shaped string (unsigned) whose payload has sub + email."""
    header = base64.urlsafe_b64encode(b'{"alg":"none"}').decode().rstrip("=")
    payload = base64.urlsafe_b64encode(
        json.dumps({"sub": sub, "email": email}).encode()
    ).decode().rstrip("=")
    return f"{header}.{payload}.sig-not-verified"


# ---------- basic read/write ------------------------------------------------

def test_empty_store_when_no_file(tmp_deckd):
    store = token_store.read()
    assert store.accounts == []
    assert store.active_user_id is None


def test_write_read_roundtrip_preserves_accounts(tmp_deckd):
    store = token_store.TokenStore()
    store.upsert(_account("user-a", "a@x.com"))
    store.upsert(_account("user-b", "b@x.com", expires_at=1_800_000_000))
    store.set_active("user-b")
    token_store.write(store)

    reloaded = token_store.read()
    assert {a.user_id for a in reloaded.accounts} == {"user-a", "user-b"}
    assert reloaded.active_user_id == "user-b"
    assert reloaded.get("user-b").email == "b@x.com"


def test_upsert_replaces_same_user_id(tmp_deckd):
    store = token_store.TokenStore()
    store.upsert(_account("user-a", "old@x.com"))
    store.upsert(_account("user-a", "new@x.com"))
    assert len(store.accounts) == 1
    assert store.accounts[0].email == "new@x.com"


def test_remove_clears_active_if_removed(tmp_deckd):
    store = token_store.TokenStore()
    store.upsert(_account("user-a", "a@x.com"))
    store.set_active("user-a")
    store.remove("user-a")
    assert store.active_user_id is None
    assert store.accounts == []


def test_set_active_rejects_unknown_user_id(tmp_deckd):
    store = token_store.TokenStore()
    with pytest.raises(token_store.TokenStoreError):
        store.set_active("ghost")


def test_schema_version_mismatch_raises(tmp_deckd):
    with pytest.raises(token_store.TokenStoreError):
        token_store.TokenStore.from_json('{"version": 99, "accounts": [], "active_user_id": null}')


# ---------- revocation state (Phase 6) --------------------------------------

def test_revoked_at_roundtrips_through_disk(tmp_deckd):
    store = token_store.TokenStore()
    acct = _account("user-a", "a@x.com")
    acct.revoked_at = 1_700_500_000
    store.upsert(acct)
    token_store.write(store)

    reloaded = token_store.read()
    assert reloaded.get("user-a").revoked_at == 1_700_500_000


def test_missing_revoked_at_in_v1_file_hydrates_to_none(tmp_deckd):
    """A pre-Phase-6 file has no revoked_at key — must load as None, not crash."""
    legacy_blob = (
        '{"version": 1, "accounts": [{"user_id": "u", "email": "e@x.com", '
        '"id_token": "i", "refresh_token": "r", "expires_at": 1700000000}], '
        '"active_user_id": "u"}'
    )
    store = token_store.TokenStore.from_json(legacy_blob)
    assert store.get("u").revoked_at is None


def test_mark_and_clear_revoked(tmp_deckd):
    store = token_store.TokenStore()
    store.upsert(_account("user-a", "a@x.com"))
    assert store.is_revoked("user-a") is False

    store.mark_revoked("user-a")
    assert store.is_revoked("user-a") is True
    assert store.get("user-a").revoked_at is not None

    store.clear_revoked("user-a")
    assert store.is_revoked("user-a") is False
    assert store.get("user-a").revoked_at is None


def test_mark_revoked_unknown_user_raises(tmp_deckd):
    store = token_store.TokenStore()
    with pytest.raises(token_store.TokenStoreError):
        store.mark_revoked("ghost")


def test_clear_revoked_unknown_user_is_noop(tmp_deckd):
    store = token_store.TokenStore()
    store.clear_revoked("ghost")  # must not raise


def test_active_healthy_returns_none_if_active_is_revoked(tmp_deckd):
    store = token_store.TokenStore()
    store.upsert(_account("user-a", "a@x.com"))
    store.set_active("user-a")
    assert store.active_healthy() is not None

    store.mark_revoked("user-a")
    assert store.active_healthy() is None
    assert store.active() is not None  # active() unchanged — still returns the revoked account


def test_active_healthy_returns_none_if_no_active(tmp_deckd):
    store = token_store.TokenStore()
    store.upsert(_account("user-a", "a@x.com"))
    assert store.active_healthy() is None


def test_login_clears_revoked_via_upsert(tmp_deckd, monkeypatch):
    """
    Behavioral guarantee: auth.login() naturally clears a locally-revoked
    account, because it constructs a fresh Account (revoked_at=None default)
    and upsert() replaces the old record entirely.

    Locks this in so a future refactor that starts *reusing* an existing
    Account across login flows would break this test and force a review.
    """
    import auth
    import base64, json
    from unittest.mock import MagicMock

    store = token_store.TokenStore()
    store.upsert(token_store.Account(
        user_id="user-a", email="a@x.com",
        id_token="stale", refresh_token="stale-r", expires_at=0,
    ))
    store.mark_revoked("user-a")
    token_store.write(store)

    payload = base64.urlsafe_b64encode(
        json.dumps({"sub": "user-a", "email": "a@x.com"}).encode()
    ).decode().rstrip("=")
    fake_id_token = f"h.{payload}.s"

    fake_client = MagicMock()
    fake_client.initiate_auth.return_value = {
        "AuthenticationResult": {
            "IdToken": fake_id_token,
            "RefreshToken": "new-refresh",
            "ExpiresIn": 3600,
        }
    }
    monkeypatch.setattr(auth, "_cognito_client", lambda: fake_client)

    auth.login("a@x.com", "password")

    reloaded = token_store.read()
    assert reloaded.is_revoked("user-a") is False
    assert reloaded.get("user-a").id_token == fake_id_token


# ---------- legacy migration ------------------------------------------------

def test_legacy_tokens_json_deleted_on_first_read(tmp_deckd):
    legacy = tmp_deckd / "tokens.json"
    legacy.write_text('{"id_token": "leaked-plaintext"}', encoding="utf-8")
    assert legacy.exists()

    store = token_store.read()
    assert not legacy.exists()  # deleted
    assert store.accounts == []  # legacy contents are NOT migrated


def test_legacy_tokens_json_wiped_before_delete(tmp_deckd, monkeypatch):
    """The plaintext must be overwritten with zeros before the file is unlinked."""
    legacy = tmp_deckd / "tokens.json"
    secret = b'{"id_token": "leaked-plaintext-abcdef"}'
    legacy.write_bytes(secret)

    captured: dict = {}
    real_remove = os.remove

    def spy_remove(path):
        # Snapshot the file bytes right before it's deleted.
        with open(path, "rb") as f:
            captured["bytes_at_delete"] = f.read()
        real_remove(path)

    monkeypatch.setattr(os, "remove", spy_remove)
    token_store.read()

    assert not legacy.exists()
    assert captured["bytes_at_delete"] == b"\x00" * len(secret)


# ---------- device identity -------------------------------------------------

def test_device_id_generated_once_and_persisted(tmp_deckd):
    first = token_store.get_device_id()
    second = token_store.get_device_id()
    assert first == second
    assert len(first) >= 32  # uuid4 string length


def test_device_id_regenerated_if_file_corrupt(tmp_deckd):
    device_file = tmp_deckd / "device.json"
    device_file.write_text("not-json", encoding="utf-8")
    device_id = token_store.get_device_id()
    assert device_id  # a fresh one was written
    # verify the file now parses cleanly
    assert json.loads(device_file.read_text())["device_id"] == device_id


# ---------- JWT sub extraction ---------------------------------------------

def test_sub_from_id_token_extracts_sub():
    token = _fake_id_token(sub="cognito-sub-abc")
    assert token_store.sub_from_id_token(token) == "cognito-sub-abc"


def test_sub_from_id_token_rejects_malformed():
    with pytest.raises(token_store.TokenStoreError):
        token_store.sub_from_id_token("not-a-jwt")


def test_sub_from_id_token_rejects_missing_sub():
    header = base64.urlsafe_b64encode(b'{"alg":"none"}').decode().rstrip("=")
    payload = base64.urlsafe_b64encode(b'{"email":"e@x.com"}').decode().rstrip("=")
    token = f"{header}.{payload}.sig"
    with pytest.raises(token_store.TokenStoreError):
        token_store.sub_from_id_token(token)
