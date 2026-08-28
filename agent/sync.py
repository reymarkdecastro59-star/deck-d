import requests
from auth import get_access_token
from session import get_unsynced, mark_synced
from config import API_URL


def sync_sessions() -> tuple[int, int]:
    pending = get_unsynced()
    if not pending:
        return 0, 0

    try:
        token = get_access_token()
    except RuntimeError:
        return 0, len(pending)

    ok, failed = 0, 0
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    for s in pending:
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
            resp = requests.post(f"{API_URL}/sessions", json=payload, headers=headers, timeout=10)
            if resp.status_code in (200, 201):
                mark_synced(s["session_id"])
                ok += 1
            else:
                failed += 1
        except requests.RequestException:
            failed += 1

    return ok, failed
