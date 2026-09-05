"""
Tests for the tray-menu builder and tooltip. Verifies structure only — actual
pystray/tkinter/winotify calls are mocked or not exercised.
"""
import pytest

import main
import token_store


def _seed(accounts, active_user_id=None, revoked=()):
    store = token_store.TokenStore()
    for uid, email in accounts:
        store.upsert(token_store.Account(
            user_id=uid, email=email, id_token="t", refresh_token="r",
            expires_at=1_700_000_000,
        ))
    if active_user_id:
        store.set_active(active_user_id)
    for uid in revoked:
        store.mark_revoked(uid)
    token_store.write(store)
    return store


# ---------- tooltip ---------------------------------------------------------

def test_tooltip_when_not_signed_in(tmp_deckd):
    _seed([])
    assert main._tooltip_for(token_store.read()) == "DECK'D — Not signed in"


def test_tooltip_when_no_active_but_accounts_exist(tmp_deckd):
    _seed([("u", "u@x.com")], active_user_id=None)
    assert main._tooltip_for(token_store.read()) == "DECK'D — No active account"


def test_tooltip_when_active_healthy(tmp_deckd):
    _seed([("u", "u@x.com")], active_user_id="u")
    assert main._tooltip_for(token_store.read()) == "DECK'D — Tracking as u@x.com"


def test_tooltip_when_active_revoked_says_no_active(tmp_deckd):
    """A revoked active account is not 'active' for tooltip purposes."""
    _seed([("u", "u@x.com")], active_user_id="u", revoked=("u",))
    assert main._tooltip_for(token_store.read()) == "DECK'D — No active account"


# ---------- menu structure --------------------------------------------------

def _labels(items):
    """Extract the .text attribute of each MenuItem, skipping separators."""
    return [i.text for i in items if getattr(i, "text", None) is not None]


def test_menu_zero_accounts_has_no_switch_no_logout_no_retry(tmp_deckd):
    _seed([])
    labels = _labels(main._build_menu())
    assert "Switch account" not in labels
    assert "Log out this account" not in labels
    assert "Retry sync" not in labels
    assert "Add account…" in labels
    assert "Quit" in labels


def test_menu_one_account_active_has_switch_and_logout_no_retry(tmp_deckd):
    _seed([("u", "u@x.com")], active_user_id="u")
    labels = _labels(main._build_menu())
    assert "Switch account" in labels
    assert "Log out this account" in labels
    assert "Retry sync" not in labels


def test_menu_shows_retry_sync_when_any_revoked(tmp_deckd):
    _seed([("u1", "a@x.com"), ("u2", "b@x.com")], active_user_id="u1", revoked=("u2",))
    labels = _labels(main._build_menu())
    assert "Retry sync" in labels


def test_switch_submenu_labels_revoked_accounts(tmp_deckd):
    _seed([("u1", "a@x.com"), ("u2", "b@x.com")], active_user_id="u1", revoked=("u2",))
    menu = main._build_menu()
    switch_item = next(i for i in menu if getattr(i, "text", None) == "Switch account")
    sub_labels = [i.text for i in switch_item.submenu.items]
    assert "a@x.com" in sub_labels
    assert "b@x.com (revoked)" in sub_labels


def test_switch_submenu_disables_revoked_accounts(tmp_deckd):
    _seed([("u1", "a@x.com"), ("u2", "b@x.com")], active_user_id="u1", revoked=("u2",))
    menu = main._build_menu()
    switch_item = next(i for i in menu if getattr(i, "text", None) == "Switch account")
    for sub in switch_item.submenu.items:
        if sub.text == "b@x.com (revoked)":
            assert sub.enabled is False or callable(sub.enabled) and sub.enabled(sub) is False
        if sub.text == "a@x.com":
            assert sub.enabled is True or callable(sub.enabled) and sub.enabled(sub) is True
