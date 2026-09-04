"""
Shared fixtures for the agent test suite.

Two things every test needs:
1. Storage redirected into a tmp directory so tests don't touch ~/.deckd
2. DPAPI encrypt/decrypt replaced by a passthrough shim (so tests run on
   Linux CI where win32crypt isn't available)
"""
import os
import pytest


@pytest.fixture
def tmp_deckd(monkeypatch, tmp_path):
    """
    Redirect all agent storage under tmp_path. Also shims DPAPI to a
    passthrough so tests run on any OS.

    Any test that touches token_store or session must request this fixture.
    """
    deckd_dir = tmp_path / ".deckd"
    deckd_dir.mkdir()

    # token_store paths
    import token_store as ts
    monkeypatch.setattr(ts, "_DECKD_DIR", str(deckd_dir))
    monkeypatch.setattr(ts, "_TOKENS_PATH", str(deckd_dir / "tokens.bin"))
    monkeypatch.setattr(ts, "_LEGACY_TOKENS_PATH", str(deckd_dir / "tokens.json"))
    monkeypatch.setattr(ts, "_DEVICE_PATH", str(deckd_dir / "device.json"))
    # DPAPI passthrough — safe for tests, never used in production
    monkeypatch.setattr(ts, "encrypt", lambda b: b"SHIM:" + b)
    monkeypatch.setattr(ts, "decrypt", lambda b: b[len(b"SHIM:"):] if b.startswith(b"SHIM:") else b)

    # session db
    import session as sess
    monkeypatch.setattr(sess, "DB_PATH", str(deckd_dir / "sessions.db"))

    yield deckd_dir
