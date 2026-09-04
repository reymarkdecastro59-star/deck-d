import sys

import requests
from auth import get_id_token
from session import get_pending_user_ids, get_unsynced, mark_synced
from token_store import get_device_id, get_device_name
from config import API_URL


def sync_sessions() -> tuple[int, int]:
    """
    Drain the local queue. Sessions are grouped by user_id so each account's
    rows post with that account's own token — never Account A's rows under
    Account B's token (conflict A6).

    Every request carries X-Device-Id + X-Device-Name so the backend can
    auto-register the install and attribute rows.

    Terminal-for-this-tick responses (401 token rejected, 403 device revoked,
    429 device cap / throttled) log once per account per drain and skip the
    remaining rows for that account — otherwise a revoked device with N
    queued rows would print N identical lines every tick, forever. Rows
    stay queued so an un-revoke or re-login picks them up on a later tick
    (proper dead-letter policy is Phase 5 scope).

    Returns (ok_count, failed_count) totalled across accounts.
    """
    pending_users = get_pending_user_ids()
    if not pending_users:
        return 0, 0

    device_id = get_device_id()
    device_name = get_device_name()

    ok_total, failed_total = 0, 0
    for user_id in pending_users:
        try:
            token = get_id_token(user_id)
        except RuntimeError:
            # This account's token has been logged out or the refresh failed.
            # Leave its rows queued — a later re-login will retry.
            failed_total += len(get_unsynced(user_id))
            continue

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "X-Device-Id": device_id,
            "X-Device-Name": device_name,
        }
        rows = get_unsynced(user_id)
        for idx, s in enumerate(rows):
            payload = {
                "session_id": s["session_id"],
                "game_exe": s["game_exe"],
                "game_name": s["game_name"],
                "started_at": s["started_at"],
                "ended_at": s["ended_at"],
                "duration_sec": s["duration_sec"],
                "label": s["label"],
            }
            try:
                resp = requests.post(
                    f"{API_URL}/sessions", json=payload, headers=headers, timeout=10
                )
                if resp.status_code in (200, 201):
                    mark_synced(s["session_id"])
                    ok_total += 1
                elif resp.status_code in (401, 403, 429):
                    _log_terminal(resp.status_code, user_id, device_id)
                    # This row + every remaining unattempted row for this account.
                    failed_total += len(rows) - idx
                    break
                else:
                    failed_total += 1
            except requests.RequestException:
                failed_total += 1

    return ok_total, failed_total


def _log_terminal(status_code: int, user_id: str, device_id: str) -> None:
    """Single log line per (account, tick) for a terminal auth/device response."""
    short_user = user_id[:8]
    short_dev = device_id[:8]
    if status_code == 401:
        msg = (
            f"[deckd] Sync refused (401) for user {short_user}... — "
            "token rejected. Re-login to resume."
        )
    elif status_code == 403:
        msg = (
            f"[deckd] Sync refused (403) for user {short_user}... — "
            f"device {short_dev}... has been revoked. "
            "Un-revoke from the web dashboard to resume."
        )
    else:  # 429
        msg = (
            f"[deckd] Sync throttled (429) for user {short_user}... — "
            "device limit exceeded or rate-limited."
        )
    print(msg, file=sys.stderr)
