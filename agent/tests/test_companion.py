"""Companion window bridge: friendly sign-in errors, state shape, callbacks."""
from unittest.mock import MagicMock

import botocore.exceptions
import pytest

import companion
import token_store


def _client_error(code):
    return botocore.exceptions.ClientError({"Error": {"Code": code, "Message": "x"}}, "InitiateAuth")


@pytest.mark.parametrize("code,expected", [
    ("NotAuthorizedException", "Incorrect email or password."),
    ("UserNotFoundException", "Incorrect email or password."),  # never reveal account existence
    ("UserNotConfirmedException", "Confirm your email first"),
    ("TooManyRequestsException", "Too many attempts"),
])
def test_friendly_errors(code, expected):
    assert companion.friendly_error(_client_error(code)).startswith(expected)


def test_network_and_unknown_errors():
    net = botocore.exceptions.EndpointConnectionError(endpoint_url="https://x")
    assert "internet connection" in companion.friendly_error(net)
    assert companion.friendly_error(RuntimeError("boom")) == "Sign-in didn't work. Please try again."


def _bridge():
    cb = {k: MagicMock() for k in ("on_signed_in", "on_signed_out", "on_hide", "on_minimize")}
    return companion.Bridge(**cb), cb


def test_sign_in_requires_both_fields(tmp_deckd):
    b, cb = _bridge()
    assert b.sign_in("  ", "pw") == {"ok": False, "error": "Enter your email and password."}
    cb["on_signed_in"].assert_not_called()


def test_sign_in_failure_is_friendly_and_does_not_start(tmp_deckd, monkeypatch):
    b, cb = _bridge()
    monkeypatch.setattr(companion.auth, "login", MagicMock(side_effect=_client_error("NotAuthorizedException")))
    res = b.sign_in("a@b.com", "wrong")
    assert res == {"ok": False, "error": "Incorrect email or password."}
    cb["on_signed_in"].assert_not_called()


def test_sign_in_success_starts_tracking_and_returns_state(tmp_deckd, monkeypatch):
    b, cb = _bridge()

    def fake_login(email, password):
        store = token_store.read()
        store.upsert(token_store.Account(user_id="u1", email=email, id_token="i",
                                         refresh_token="r", expires_at=2_000_000_000))
        store.set_active("u1")
        token_store.write(store)

    monkeypatch.setattr(companion.auth, "login", fake_login)
    res = b.sign_in(" a@b.com ", "pw")
    assert res["ok"] is True
    cb["on_signed_in"].assert_called_once()
    st = res["state"]
    assert st["signed_in"] is True and st["email"] == "a@b.com"
    for key in ("today_sec", "week_sec", "week_days", "live", "last_session", "pending_sync", "autostart"):
        assert key in st


def test_signed_out_state(tmp_deckd):
    b, _ = _bridge()
    st = b.get_state()
    assert st["signed_in"] is False and st["email"] is None
    assert "today_sec" not in st


def test_only_intended_methods_are_public():
    public = {n for n in dir(companion.Bridge) if not n.startswith("_")}
    assert public == {"get_state", "sign_in", "sign_out", "set_autostart", "sync_now",
                      "open_dashboard", "open_signup", "hide", "minimize"}
