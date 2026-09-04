import requests
from auth import get_id_token
from session import get_pending_user_ids, get_unsynced, mark_synced
from config import API_URL


def sync_sessions() -> tuple[int, int]:
    """
    Drain the local queue. Sessions are grouped by user_id so each account's
    rows post with that account's own token — never Account A's rows under
    Account B's token (conflict A6).

    Returns (ok_count, failed_count) totalled across accounts.
    """
    pending_users = get_pending_user_ids()
    if not pending_users:
        return 0, 0

    ok_total, failed_total = 0, 0
    for user_id in pending_users:
        try:
            token = get_id_token(user_id)
        except RuntimeError:
            # This account's token has been logged out or the refresh failed.
            # Leave its rows queued — a later re-login will retry.
            failed_total += len(get_unsynced(user_id))
            continue

        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        for s in get_unsynced(user_id):
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
                else:
                    failed_total += 1
            except requests.RequestException:
                failed_total += 1

    return ok_total, failed_total
