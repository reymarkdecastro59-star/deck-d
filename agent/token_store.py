"""
Encrypted, multi-account token storage for the DECK'D tray agent.

Ciphertext at rest via Windows DPAPI (`CryptProtectData`), scoped to the current
Windows user + machine. Copying the ciphertext to another user or another PC
renders it unreadable — the OS refuses the decrypt.

Schema (v1):
    {
      "version": 1,
      "accounts": [
        {"user_id", "email", "id_token", "refresh_token", "expires_at"},
        ...
      ],
      "active_user_id": "..." | null
    }

`device_id` lives in a separate plaintext file (`~/.deckd/device.json`) because
it's not a secret — the backend trusts it only when it arrives alongside a
valid Cognito ID token.
"""
from __future__ import annotations

import base64
import json
import os
import sys
import uuid
from dataclasses import dataclass, field
from typing import Optional

_DECKD_DIR = os.path.join(os.path.expanduser("~"), ".deckd")
_TOKENS_PATH = os.path.join(_DECKD_DIR, "tokens.bin")
_LEGACY_TOKENS_PATH = os.path.join(_DECKD_DIR, "tokens.json")
_DEVICE_PATH = os.path.join(_DECKD_DIR, "device.json")
_ENTROPY = b"DECKD_TOKENS_v1"  # DPAPI additional entropy — pins ciphertext to this app

SCHEMA_VERSION = 1


class TokenStoreError(RuntimeError):
    """Raised when the encrypted store cannot be read, written, or decrypted."""


# ---------------------------------------------------------------------------
# Cipher — swappable so tests can inject a passthrough shim
# ---------------------------------------------------------------------------

def _dpapi_encrypt(data: bytes) -> bytes:
    """CryptProtectData with app-scoped entropy. Windows-only."""
    import win32crypt  # local import so non-Windows envs don't break at module load
    return win32crypt.CryptProtectData(data, None, _ENTROPY, None, None, 0)


def _dpapi_decrypt(blob: bytes) -> bytes:
    import win32crypt
    _desc, plaintext = win32crypt.CryptUnprotectData(blob, _ENTROPY, None, None, 0)
    return plaintext


# Module-level indirection lets tests monkeypatch these two symbols to a
# passthrough shim instead of stubbing out win32crypt itself.
encrypt = _dpapi_encrypt
decrypt = _dpapi_decrypt


# ---------------------------------------------------------------------------
# Domain model
# ---------------------------------------------------------------------------

@dataclass
class Account:
    user_id: str
    email: str
    id_token: str
    refresh_token: str
    expires_at: int  # epoch seconds; caller should refresh a few minutes early

    def to_dict(self) -> dict:
        return {
            "user_id": self.user_id,
            "email": self.email,
            "id_token": self.id_token,
            "refresh_token": self.refresh_token,
            "expires_at": self.expires_at,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Account":
        return cls(
            user_id=d["user_id"],
            email=d["email"],
            id_token=d["id_token"],
            refresh_token=d["refresh_token"],
            expires_at=int(d["expires_at"]),
        )


@dataclass
class TokenStore:
    accounts: list[Account] = field(default_factory=list)
    active_user_id: Optional[str] = None

    # -------- account operations --------

    def get(self, user_id: str) -> Optional[Account]:
        for a in self.accounts:
            if a.user_id == user_id:
                return a
        return None

    def upsert(self, account: Account) -> None:
        for i, a in enumerate(self.accounts):
            if a.user_id == account.user_id:
                self.accounts[i] = account
                return
        self.accounts.append(account)

    def remove(self, user_id: str) -> bool:
        before = len(self.accounts)
        self.accounts = [a for a in self.accounts if a.user_id != user_id]
        if self.active_user_id == user_id:
            self.active_user_id = None
        return len(self.accounts) != before

    def active(self) -> Optional[Account]:
        if self.active_user_id is None:
            return None
        return self.get(self.active_user_id)

    def set_active(self, user_id: str) -> None:
        if self.get(user_id) is None:
            raise TokenStoreError(f"cannot set active: user_id {user_id!r} not in store")
        self.active_user_id = user_id

    # -------- serialization --------

    def to_json(self) -> str:
        return json.dumps({
            "version": SCHEMA_VERSION,
            "accounts": [a.to_dict() for a in self.accounts],
            "active_user_id": self.active_user_id,
        })

    @classmethod
    def from_json(cls, blob: str) -> "TokenStore":
        raw = json.loads(blob)
        version = raw.get("version")
        if version != SCHEMA_VERSION:
            raise TokenStoreError(f"unknown token store version: {version!r}")
        return cls(
            accounts=[Account.from_dict(a) for a in raw.get("accounts", [])],
            active_user_id=raw.get("active_user_id"),
        )


# ---------------------------------------------------------------------------
# Disk I/O
# ---------------------------------------------------------------------------

def _ensure_dir() -> None:
    os.makedirs(_DECKD_DIR, exist_ok=True)


def read() -> TokenStore:
    """Load the token store. Migrates + deletes legacy plaintext tokens.json on first call."""
    _migrate_legacy()
    if not os.path.exists(_TOKENS_PATH):
        return TokenStore()
    try:
        with open(_TOKENS_PATH, "rb") as f:
            blob = f.read()
        plaintext = decrypt(blob)
        return TokenStore.from_json(plaintext.decode("utf-8"))
    except TokenStoreError:
        raise
    except Exception as exc:
        # Wrap OS/crypto errors so callers can handle a single exception type.
        raise TokenStoreError(f"failed to read token store: {exc!r}") from exc


def write(store: TokenStore) -> None:
    _ensure_dir()
    try:
        blob = encrypt(store.to_json().encode("utf-8"))
    except Exception as exc:
        raise TokenStoreError(f"failed to encrypt token store: {exc!r}") from exc
    tmp_path = _TOKENS_PATH + ".tmp"
    with open(tmp_path, "wb") as f:
        f.write(blob)
    os.replace(tmp_path, _TOKENS_PATH)  # atomic on same filesystem


def _migrate_legacy() -> None:
    """
    If a legacy plaintext tokens.json exists, delete it and require re-login.

    We deliberately don't move plaintext tokens into the encrypted store —
    the plaintext file is a security liability we want gone. Re-logging in
    is a small cost for a clean cutover.
    """
    if not os.path.exists(_LEGACY_TOKENS_PATH):
        return
    try:
        os.remove(_LEGACY_TOKENS_PATH)
        print(
            "[deckd] Detected legacy plaintext tokens.json — deleted for security. "
            "Please re-run login.py.",
            file=sys.stderr,
        )
    except OSError as exc:
        # Non-fatal: user can manually delete. Log and continue.
        print(f"[deckd] Warning: could not delete legacy tokens.json: {exc}", file=sys.stderr)


# ---------------------------------------------------------------------------
# Device identity — separate file, not a secret
# ---------------------------------------------------------------------------

def get_device_id() -> str:
    """Return a UUID that identifies this agent install. Generated on first call."""
    _ensure_dir()
    if os.path.exists(_DEVICE_PATH):
        try:
            with open(_DEVICE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            device_id = data.get("device_id")
            if isinstance(device_id, str) and device_id:
                return device_id
        except (OSError, json.JSONDecodeError):
            pass  # fall through and regenerate
    device_id = str(uuid.uuid4())
    with open(_DEVICE_PATH, "w", encoding="utf-8") as f:
        json.dump({"device_id": device_id}, f)
    return device_id


def get_device_name() -> str:
    """Best-effort human-friendly device name (COMPUTERNAME on Windows)."""
    return os.environ.get("COMPUTERNAME") or os.environ.get("HOSTNAME") or "unknown-device"


# ---------------------------------------------------------------------------
# JWT sub extraction (no signature verification — we trust our own cached token)
# ---------------------------------------------------------------------------

def sub_from_id_token(id_token: str) -> str:
    """Extract the Cognito 'sub' claim from an ID token JWT payload."""
    try:
        _header, payload_b64, _sig = id_token.split(".")
    except ValueError as exc:
        raise TokenStoreError(f"malformed JWT: {exc}") from exc
    padding = "=" * (-len(payload_b64) % 4)
    payload = json.loads(base64.urlsafe_b64decode(payload_b64 + padding))
    sub = payload.get("sub")
    if not isinstance(sub, str) or not sub:
        raise TokenStoreError("id_token payload missing 'sub' claim")
    return sub
