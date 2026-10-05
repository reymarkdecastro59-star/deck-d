"""Run the Steam import.

If the user connected Steam on the web, the backend imports through Steam's
Web API and this tracker only nudges it (POST /steam/sync). When the profile
hides game details, the tracker reads Steam on this PC instead — for the
connected (verified) account only. Without a connection, the user picks the
local account in the tracker window.


Each launcher's list is uploaded whole with PUT /imports/{source}; the
backend REPLACES that launcher's previous import, so re-running never adds
duplicates, and tracked sessions are never touched.

Runs:
  * once automatically after the first sign-in on this PC,
  * when the web's "Re-import" button leaves a request (seen on heartbeat),
  * when the user clicks Import in the tracker window.
"""
from __future__ import annotations

import json
import os
import threading
import time

import requests

import sync
import token_store
from auth import get_id_token
from config import API_URL
from importers import steam
from token_store import get_device_id, get_device_name

_STATE_PATH = os.path.join(os.path.expanduser("~"), ".deckd", "import.json")
_MAX_GAMES = 3000  # backend limit per upload
_lock = threading.Lock()


# ── local preferences / last result ─────────────────────────────────────────

def _load() -> dict:
    try:
        with open(_STATE_PATH, encoding="utf-8") as fh:
            data = json.load(fh)
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def _save(state: dict) -> None:
    try:
        os.makedirs(os.path.dirname(_STATE_PATH), exist_ok=True)
        with open(_STATE_PATH, "w", encoding="utf-8") as fh:
            json.dump(state, fh)
    except OSError:
        pass


def steam_accounts() -> list[dict]:
    try:
        return steam.list_accounts()
    except Exception:  # noqa: BLE001 — a malformed Steam file must not crash the tracker
        return []


def selected_steam_account(accounts: list[dict] | None = None) -> str | None:
    """The connected (verified) account if any; else the account chosen in the
    tracker window; else the most recently used one."""
    accounts = steam_accounts() if accounts is None else accounts
    link = sync.steam_link()
    if link and link.get("account_id"):
        return str(link["account_id"])
    chosen = _load().get("steam_account_id")
    if chosen and any(a["account_id"] == chosen for a in accounts):
        return chosen
    return accounts[0]["account_id"] if accounts else None


def set_steam_account(account_id: str) -> None:
    state = _load()
    state["steam_account_id"] = str(account_id)
    _save(state)


def status() -> dict:
    accounts = steam_accounts()
    state = _load()
    return {
        "steam_accounts": accounts,
        "steam_account_id": selected_steam_account(accounts),
        "connected": sync.steam_link(),
        "running": _lock.locked(),
        "last_run_at": state.get("last_run_at"),
        "last_result": state.get("last_result"),
    }


# ── running ─────────────────────────────────────────────────────────────────

def _auth_headers() -> dict | None:
    active = token_store.read().active_healthy()
    if active is None:
        return None
    return {
        "Authorization": f"Bearer {get_id_token(active.user_id)}",
        "X-Device-Id": get_device_id(),
        "X-Device-Name": get_device_name(),
    }


def _sync_via_steam(headers: dict) -> dict:
    """Ask the backend to import through the Steam connection."""
    try:
        resp = requests.post(f"{API_URL}/steam/sync", headers=headers, timeout=60)
    except requests.RequestException as exc:
        return {"ok": False, "error": f"Couldn't reach DECK'D ({type(exc).__name__})"}
    if resp.status_code == 200:
        imp = resp.json().get("import", {})
        return {"ok": True, "count": imp.get("count"), "hours": imp.get("total_hours"), "via": "steam"}
    try:
        err = resp.json().get("error")
    except ValueError:
        err = None
    return {"ok": False, "error": err or f"HTTP {resp.status_code}", "private": err == "steam_private"}


def _upload(source: str, label: str | None, games: list[dict], headers: dict) -> dict:
    games = sorted(games, key=lambda g: g["minutes"], reverse=True)[:_MAX_GAMES]
    try:
        resp = requests.put(
            f"{API_URL}/imports/{source}",
            json={"account_label": label, "games": games},
            headers=headers,
            timeout=60,
        )
    except requests.RequestException as exc:
        return {"ok": False, "error": f"Couldn't reach DECK'D ({type(exc).__name__})"}
    if resp.status_code == 409:
        # The Steam connection imported it already; it wins over one PC's view.
        return {"ok": True, "via": "steam", "count": None}
    if resp.status_code != 200:
        return {"ok": False, "error": f"DECK'D returned HTTP {resp.status_code}"}
    summary = resp.json().get("import", {})
    return {"ok": True, "count": summary.get("count", len(games)), "hours": summary.get("total_hours")}


def _run_steam(headers: dict) -> dict:
    link = sync.steam_link()
    if link and link.get("api_ok"):
        result = _sync_via_steam(headers)
        if result["ok"] or not result.get("private"):
            return result
        # Private game details: fall through to reading this PC.
    accounts = steam_accounts()
    account = selected_steam_account(accounts)
    if account is None:
        return {"ok": False, "error": "Steam isn't installed on this PC"}
    local = next((a for a in accounts if a["account_id"] == account), None)
    if link and local is None:
        return {"ok": False, "error": "Your connected Steam account hasn't been used on this PC"}
    label = local["persona"] if local else None
    return _upload("steam", label, steam.collect(account), headers)


def run_import() -> dict:
    """Import Steam now. Returns {"steam": result}."""
    if not _lock.acquire(blocking=False):
        return {"error": "An import is already running"}
    try:
        try:
            headers = _auth_headers()
        except RuntimeError:
            headers = None
        if headers is None:
            results = {"steam": {"ok": False, "error": "Not signed in"}}
        else:
            results = {"steam": _run_steam(headers)}
        state = _load()
        state["last_run_at"] = int(time.time())
        state["last_result"] = results
        if any(r.get("ok") for r in results.values()):
            state["first_import_done"] = True
        _save(state)
        return results
    finally:
        _lock.release()


def run_in_background(on_done=None) -> None:
    def _go():
        result = run_import()
        if on_done:
            try:
                on_done(result)
            except Exception:  # noqa: BLE001
                pass
    threading.Thread(target=_go, daemon=True, name="deckd-import").start()


def maybe_run_requested(requested_at: int | None) -> bool:
    """Run if the web asked for a re-import after our last run."""
    if not requested_at:
        return False
    if int(requested_at) <= int(_load().get("last_run_at") or 0):
        return False
    run_import()
    return True


def maybe_run_first_time() -> bool:
    """Import once automatically after this PC's first sign-in."""
    if _load().get("first_import_done"):
        return False
    run_import()
    return True
