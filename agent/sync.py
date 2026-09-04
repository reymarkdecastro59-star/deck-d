import sys
import time

import requests
from auth import get_id_token
from session import (
    get_pending_user_ids,
    get_unsynced,
    mark_synced,
    is_backoff_expired,
    record_sync_success,
    record_sync_failure,
    mark_auth_failed,
    dead_letter_pending,
    get_sync_state,
)
from token_store import get_device_id, get_device_name
from config import API_URL

# Exponential backoff schedule for transient failures. Doubles per failure
# up to _BACKOFF_CAP_SEC. Fresh failures start at _BACKOFF_BASE_SEC.
_BACKOFF_BASE_SEC = 60          # 1 min
_BACKOFF_CAP_SEC = 30 * 60      # 30 min
# After this long of continuous failures, dead-letter the whole queue for
# that account so it stops occupying retry budget forever.
_DEAD_LETTER_AFTER_SEC = 24 * 60 * 60


def _next_backoff(failure_count: int) -> int:
    """Doubling schedule: 60, 120, 240, 480, 960, 1800 (cap). failure_count is
    the count BEFORE recording the current failure."""
    delay = _BACKOFF_BASE_SEC * (2 ** failure_count)
    return min(delay, _BACKOFF_CAP_SEC)


def sync_sessions() -> tuple[int, int]:
    """
    Drain the local queue. Sessions are grouped by user_id so each account's
    rows post with that account's own token — never Account A's rows under
    Account B's token (conflict A6).

    Every request carries X-Device-Id + X-Device-Name so the backend can
    auto-register the install and attribute rows.

    Retry policy (Phase 5):
    - Per-user exponential backoff on transient failures (network, 5xx).
      Doubles from 60s up to 30min. State is persisted in the sync_state
      table so a restart doesn't reset the backoff clock.
    - After 24h of continuous failure the entire pending queue for that
      user is dead-lettered — stored for audit, never retried. Frees up
      retry budget for accounts that can actually sync.
    - 401 → mark this account auth_failed. Sync stops trying until the
      user re-logs in (which clears the flag via auth.login).
    - 403 (device revoked) / 429 (device cap) still hold rows and back off,
      but a subsequent web-side un-revoke lets them drain.

    Returns (ok_count, failed_count) totalled across accounts.
    """
    pending_users = get_pending_user_ids()
    if not pending_users:
        return 0, 0

    now = int(time.time())
    device_id = get_device_id()
    device_name = get_device_name()

    ok_total, failed_total = 0, 0
    for user_id in pending_users:
        # Skip users we're backing off from.
        if not is_backoff_expired(user_id, now):
            continue

        state = get_sync_state(user_id)
        # Long-running failure? Cut our losses and dead-letter the queue.
        if state["first_failure_at"] is not None and (
            now - state["first_failure_at"] >= _DEAD_LETTER_AFTER_SEC
        ):
            count = dead_letter_pending(user_id)
            print(
                f"[deckd] Dead-lettered {count} rows for user {user_id[:8]}... "
                f"after {_DEAD_LETTER_AFTER_SEC // 3600}h of failed sync attempts.",
                file=sys.stderr,
            )
            record_sync_success(user_id)  # clears backoff so we don't retry
            continue

        try:
            token = get_id_token(user_id)
        except RuntimeError:
            # Refresh failed or account was logged out mid-flight.
            # Treat as auth failure — leave rows queued for a re-login.
            mark_auth_failed(user_id, now)
            failed_total += len(get_unsynced(user_id))
            continue

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "X-Device-Id": device_id,
            "X-Device-Name": device_name,
        }
        rows = get_unsynced(user_id)
        account_had_failure = False
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
                elif resp.status_code == 401:
                    _log_terminal(401, user_id, device_id)
                    mark_auth_failed(user_id, now)
                    account_had_failure = True
                    failed_total += len(rows) - idx
                    break
                elif resp.status_code in (403, 429):
                    _log_terminal(resp.status_code, user_id, device_id)
                    account_had_failure = True
                    failed_total += len(rows) - idx
                    break
                else:
                    # 5xx or unexpected — count as transient, keep the row.
                    account_had_failure = True
                    failed_total += 1
            except requests.RequestException:
                account_had_failure = True
                failed_total += 1

        # Update backoff state for this account exactly once per tick.
        if account_had_failure:
            record_sync_failure(user_id, now, _next_backoff(state["failure_count"]))
        elif rows:
            # Every row sent OK — reset backoff so the account is fully clean.
            record_sync_success(user_id)

    return ok_total, failed_total


def _log_terminal(status_code: int, user_id: str, device_id: str) -> None:
    """Single log line per (account, tick) for a terminal auth/device response."""
    short_user = user_id[:8]
    short_dev = device_id[:8]
    if status_code == 401:
        msg = (
            f"[deckd] Sync refused (401) for user {short_user}... — "
            "token rejected. This account is paused until you re-login."
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
