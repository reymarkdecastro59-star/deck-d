"""
Auth surface for the DECK'D tray agent.

Wraps token_store with Cognito login/refresh. Multi-account aware:
    login(email, password)              -> add or update an account and make it active
    logout(user_id=None)                -> forget an account (default: active)
    switch_account(user_id)             -> mark a different stored account as active
    list_accounts() -> list[dict]       -> [{user_id, email, expires_at}]
    get_active_user_id() -> str | None
    get_id_token(user_id=None) -> str   -> auto-refresh if expired
    is_logged_in() -> bool
"""
from __future__ import annotations

import base64
import json
import time
from typing import Optional

import boto3

import token_store
from config import CLIENT_ID, REGION

# Refresh a few minutes before actual expiry to give the caller headroom.
_REFRESH_HEADROOM_SEC = 600


def _cognito_client():
    return boto3.client("cognito-idp", region_name=REGION)


def _email_from_id_token(id_token: str) -> str:
    """Best-effort: pull the 'email' claim out of the ID token payload."""
    try:
        _h, payload_b64, _s = id_token.split(".")
        padding = "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64 + padding))
        email = payload.get("email")
        return email if isinstance(email, str) else ""
    except Exception:
        return ""


def login(email: str, password: str) -> dict:
    """
    Authenticate via Cognito, store the account, mark it active.

    Returns the stored account as a dict (without the raw tokens) so callers
    can display it without a second read.
    """
    resp = _cognito_client().initiate_auth(
        AuthFlow="USER_PASSWORD_AUTH",
        AuthParameters={"USERNAME": email, "PASSWORD": password},
        ClientId=CLIENT_ID,
    )
    result = resp["AuthenticationResult"]
    id_token = result["IdToken"]
    user_id = token_store.sub_from_id_token(id_token)
    canonical_email = _email_from_id_token(id_token) or email

    account = token_store.Account(
        user_id=user_id,
        email=canonical_email,
        id_token=id_token,
        refresh_token=result["RefreshToken"],
        expires_at=int(time.time()) + int(result["ExpiresIn"]) - _REFRESH_HEADROOM_SEC,
    )
    store = token_store.read()
    store.upsert(account)
    store.set_active(user_id)
    token_store.write(store)
    # Clear any Phase-5 auth_failed / backoff flag so sync starts fresh.
    # Import here to avoid circular-import risk at module load time.
    try:
        import session
        session.clear_auth_failed(user_id)
    except Exception:
        pass  # non-fatal: session module missing during setup
    return {"user_id": user_id, "email": canonical_email, "expires_at": account.expires_at}


def logout(user_id: Optional[str] = None) -> bool:
    """Remove an account from the store. Defaults to the active one."""
    store = token_store.read()
    target = user_id or store.active_user_id
    if target is None:
        return False
    removed = store.remove(target)
    token_store.write(store)
    return removed


def switch_account(user_id: str) -> None:
    """Make a different stored account the active one."""
    store = token_store.read()
    store.set_active(user_id)
    token_store.write(store)


def list_accounts() -> list[dict]:
    store = token_store.read()
    return [
        {"user_id": a.user_id, "email": a.email, "expires_at": a.expires_at,
         "active": a.user_id == store.active_user_id}
        for a in store.accounts
    ]


def get_active_user_id() -> Optional[str]:
    return token_store.read().active_user_id


def is_logged_in() -> bool:
    """True iff an active account exists with either a valid ID token or a refresh token."""
    store = token_store.read()
    active = store.active()
    return active is not None and bool(active.refresh_token)


def get_id_token(user_id: Optional[str] = None) -> str:
    """
    Return a valid ID token for the given (or active) account.
    Refreshes silently against Cognito if the cached token is past its expiry window.
    """
    store = token_store.read()
    target_id = user_id or store.active_user_id
    if target_id is None:
        raise RuntimeError("Not logged in. Run login.py first.")
    account = store.get(target_id)
    if account is None:
        raise RuntimeError(f"No stored account for user_id {target_id!r}. Run login.py.")

    if time.time() < account.expires_at:
        return account.id_token

    # Refresh
    resp = _cognito_client().initiate_auth(
        AuthFlow="REFRESH_TOKEN_AUTH",
        AuthParameters={"REFRESH_TOKEN": account.refresh_token},
        ClientId=CLIENT_ID,
    )
    result = resp["AuthenticationResult"]
    account.id_token = result["IdToken"]
    account.expires_at = int(time.time()) + int(result["ExpiresIn"]) - _REFRESH_HEADROOM_SEC
    # Cognito may or may not rotate the refresh token — keep the old one if not returned.
    if "RefreshToken" in result:
        account.refresh_token = result["RefreshToken"]
    store.upsert(account)
    token_store.write(store)
    return account.id_token
