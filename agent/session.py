import sqlite3
import threading
import uuid
import time
import os

DB_PATH = os.path.join(os.path.expanduser("~"), ".deckd", "sessions.db")

# Phase 5 bumps to 2: adds sync_state table (retry backoff) and introduces
# synced=2 as the dead-letter tombstone value.
_SCHEMA_VERSION = 2
_migration_lock = threading.Lock()
_migrated_for_path: str | None = None

# synced column values
SYNC_PENDING = 0
SYNC_DONE = 1
SYNC_DEAD_LETTER = 2  # permanent failure — stop attempting, keep for audit

# Crash-recovery policy: sessions still open (ended_at IS NULL) whose
# started_at is older than this are almost certainly a crashed game that
# will never legitimately end — close them with a timestamp of started_at
# so they show as ~0 duration and don't inflate any aggregate.
_CRASH_RECOVERY_MAX_AGE_SEC = 24 * 60 * 60


def _run_migration(conn: sqlite3.Connection) -> None:
    """Idempotent schema bring-up. Guarded by PRAGMA user_version and a
    per-process lock so watcher + sync threads can't both ALTER concurrently.
    Cross-process races are absorbed by the OperationalError catch on ALTER."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id   TEXT PRIMARY KEY,
            game_exe     TEXT NOT NULL,
            game_name    TEXT NOT NULL,
            started_at   INTEGER NOT NULL,
            ended_at     INTEGER,
            duration_sec INTEGER,
            label        TEXT DEFAULT 'tracked',
            synced       INTEGER DEFAULT 0,
            user_id      TEXT
        )
    """)
    # Phase 5: per-user sync backoff state so a persistent auth or network
    # failure doesn't hammer the backend every SYNC_INTERVAL_SEC seconds.
    # auth_failed=1 means "stop trying until user re-logs in".
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sync_state (
            user_id           TEXT PRIMARY KEY,
            failure_count     INTEGER DEFAULT 0,
            next_retry_at     INTEGER DEFAULT 0,
            first_failure_at  INTEGER,
            auth_failed       INTEGER DEFAULT 0
        )
    """)
    version = conn.execute("PRAGMA user_version").fetchone()[0]
    if version < 1:
        cols = {row[1] for row in conn.execute("PRAGMA table_info(sessions)")}
        if "user_id" not in cols:
            try:
                conn.execute("ALTER TABLE sessions ADD COLUMN user_id TEXT")
            except sqlite3.OperationalError:
                # Another process (or a prior partial migration) already added it.
                pass
    if version < _SCHEMA_VERSION:
        conn.execute(f"PRAGMA user_version = {_SCHEMA_VERSION}")
    conn.commit()


def _get_conn():
    global _migrated_for_path
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    if _migrated_for_path != DB_PATH:
        with _migration_lock:
            if _migrated_for_path != DB_PATH:
                _run_migration(conn)
                _migrated_for_path = DB_PATH
    return conn


def _reset_migration_state_for_tests() -> None:
    """Test-only hook so each `tmp_deckd` fixture gets a fresh migration run."""
    global _migrated_for_path
    _migrated_for_path = None


def open_session(user_id: str, game_exe: str, game_name: str) -> str:
    session_id = str(uuid.uuid4())
    with _get_conn() as conn:
        conn.execute(
            "INSERT INTO sessions (session_id, game_exe, game_name, started_at, user_id) "
            "VALUES (?, ?, ?, ?, ?)",
            (session_id, game_exe, game_name, int(time.time()), user_id),
        )
    return session_id


def close_session(session_id: str) -> dict | None:
    ended_at = int(time.time())
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT started_at FROM sessions WHERE session_id = ?", (session_id,)
        ).fetchone()
        if not row:
            return None
        duration_sec = ended_at - row[0]
        conn.execute(
            "UPDATE sessions SET ended_at = ?, duration_sec = ? WHERE session_id = ?",
            (ended_at, duration_sec, session_id),
        )
    return {"session_id": session_id, "duration_sec": duration_sec}


_COLS = ["session_id", "game_exe", "game_name", "started_at", "ended_at",
         "duration_sec", "label", "synced", "user_id"]


def get_unsynced(user_id: str) -> list[dict]:
    """Return closed, unsynced sessions belonging to a specific account.
    Dead-letter rows (synced=2) are excluded — those are permanent failures
    kept for audit but not retried."""
    with _get_conn() as conn:
        rows = conn.execute(
            "SELECT session_id, game_exe, game_name, started_at, ended_at, "
            "duration_sec, label, synced, user_id "
            "FROM sessions WHERE synced = ? AND ended_at IS NOT NULL AND user_id = ?",
            (SYNC_PENDING, user_id),
        ).fetchall()
    return [dict(zip(_COLS, row)) for row in rows]


def get_pending_user_ids() -> list[str]:
    """Distinct user_ids that have at least one closed, unsynced session queued."""
    with _get_conn() as conn:
        rows = conn.execute(
            "SELECT DISTINCT user_id FROM sessions "
            "WHERE synced = ? AND ended_at IS NOT NULL AND user_id IS NOT NULL",
            (SYNC_PENDING,),
        ).fetchall()
    return [r[0] for r in rows]


def mark_synced(session_id: str):
    with _get_conn() as conn:
        conn.execute(
            "UPDATE sessions SET synced = ? WHERE session_id = ?",
            (SYNC_DONE, session_id),
        )


# ---------------------------------------------------------------------------
# Crash recovery (Phase 5)
# ---------------------------------------------------------------------------

def recover_orphan_sessions(now: int | None = None) -> tuple[int, int]:
    """Close sessions the watcher left open (agent crashed, machine cut power).

    Rows with started_at within the last CRASH_RECOVERY_MAX_AGE_SEC are closed
    with ended_at = started_at (0-duration marker) — we don't know when the
    game actually stopped and pretending it ran for hours would inflate every
    aggregate. Older orphans are dead-lettered so they don't sit forever.

    Returns (closed_count, dead_lettered_count). Call once at agent startup
    BEFORE the watcher launches to avoid racing on the same row.
    """
    if now is None:
        now = int(time.time())
    cutoff = now - _CRASH_RECOVERY_MAX_AGE_SEC
    with _get_conn() as conn:
        # Recent orphans → close with 0 duration so they exist for audit but
        # don't fabricate playtime.
        closed_cur = conn.execute(
            "UPDATE sessions SET ended_at = started_at, duration_sec = 0 "
            "WHERE ended_at IS NULL AND started_at >= ?",
            (cutoff,),
        )
        # Ancient orphans → dead-letter with the same synthetic close.
        dead_cur = conn.execute(
            "UPDATE sessions SET ended_at = started_at, duration_sec = 0, synced = ? "
            "WHERE ended_at IS NULL AND started_at < ?",
            (SYNC_DEAD_LETTER, cutoff),
        )
    return closed_cur.rowcount, dead_cur.rowcount


def get_open_session_count() -> int:
    """Number of sessions still open (ended_at IS NULL). Useful for tests
    and for a startup sanity check before crash recovery runs."""
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT COUNT(*) FROM sessions WHERE ended_at IS NULL"
        ).fetchone()
    return int(row[0]) if row else 0


# ---------------------------------------------------------------------------
# Retry backoff + dead-letter (Phase 5)
# ---------------------------------------------------------------------------

def get_sync_state(user_id: str) -> dict:
    """Return the current backoff state for a user (or a fresh empty state)."""
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT failure_count, next_retry_at, first_failure_at, auth_failed "
            "FROM sync_state WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    if not row:
        return {
            "failure_count": 0,
            "next_retry_at": 0,
            "first_failure_at": None,
            "auth_failed": 0,
        }
    return {
        "failure_count": row[0],
        "next_retry_at": row[1],
        "first_failure_at": row[2],
        "auth_failed": row[3],
    }


def record_sync_success(user_id: str) -> None:
    """Clear all backoff / failure state for a user on a good sync."""
    with _get_conn() as conn:
        conn.execute("DELETE FROM sync_state WHERE user_id = ?", (user_id,))


def record_sync_failure(user_id: str, now: int, backoff_sec: int) -> None:
    """Increment failure count and schedule the next retry (atomic upsert)."""
    with _get_conn() as conn:
        conn.execute(
            "INSERT INTO sync_state "
            "(user_id, failure_count, next_retry_at, first_failure_at, auth_failed) "
            "VALUES (?, 1, ?, ?, 0) "
            "ON CONFLICT(user_id) DO UPDATE SET "
            "failure_count = failure_count + 1, "
            "next_retry_at = excluded.next_retry_at, "
            "first_failure_at = COALESCE(sync_state.first_failure_at, excluded.first_failure_at)",
            (user_id, now + backoff_sec, now),
        )


def mark_auth_failed(user_id: str, now: int) -> None:
    """Persistent flag: server rejected our token. Skip this user in sync
    until a re-login clears the flag. Atomic — no read-modify-write race."""
    with _get_conn() as conn:
        conn.execute(
            "INSERT INTO sync_state "
            "(user_id, failure_count, next_retry_at, first_failure_at, auth_failed) "
            "VALUES (?, 1, ?, ?, 1) "
            "ON CONFLICT(user_id) DO UPDATE SET "
            "failure_count = failure_count + 1, "
            "next_retry_at = excluded.next_retry_at, "
            "first_failure_at = COALESCE(sync_state.first_failure_at, excluded.first_failure_at), "
            "auth_failed = 1",
            (user_id, now + 3600, now),
        )


def clear_auth_failed(user_id: str) -> None:
    """Called after a successful re-login to allow sync attempts again."""
    with _get_conn() as conn:
        conn.execute(
            "UPDATE sync_state SET auth_failed = 0, failure_count = 0, "
            "next_retry_at = 0, first_failure_at = NULL WHERE user_id = ?",
            (user_id,),
        )


def is_backoff_expired(user_id: str, now: int) -> bool:
    """Sync loop calls this before attempting a user — False means "wait"."""
    state = get_sync_state(user_id)
    if state["auth_failed"]:
        return False
    return now >= state["next_retry_at"]


def dead_letter_pending(user_id: str) -> int:
    """Tombstone this user's rows that were ready to sync but couldn't.

    Only closed (ended_at IS NOT NULL) pending rows are affected — a still-
    open row is the crash-recovery layer's responsibility, not sync's.
    Called after 24h of failures or when the user explicitly gives up.
    Returns rowcount.
    """
    with _get_conn() as conn:
        cur = conn.execute(
            "UPDATE sessions SET synced = ? "
            "WHERE user_id = ? AND synced = ? AND ended_at IS NOT NULL",
            (SYNC_DEAD_LETTER, user_id, SYNC_PENDING),
        )
    return cur.rowcount


def get_dead_letter_count(user_id: str | None = None) -> int:
    """Count of dead-lettered rows, optionally scoped to one user.
    Surfaced via the tray tooltip so the user knows their data is stuck."""
    with _get_conn() as conn:
        if user_id is None:
            row = conn.execute(
                "SELECT COUNT(*) FROM sessions WHERE synced = ?",
                (SYNC_DEAD_LETTER,),
            ).fetchone()
        else:
            row = conn.execute(
                "SELECT COUNT(*) FROM sessions WHERE synced = ? AND user_id = ?",
                (SYNC_DEAD_LETTER, user_id),
            ).fetchone()
    return int(row[0]) if row else 0


def migrate_legacy_rows(user_id: str) -> int:
    """
    Attribute pre-Phase-1 rows (user_id IS NULL) to the given account.

    Intended as a one-shot after upgrade: user re-logs in, agent offers to
    claim orphan sessions. Returns number of rows updated. Legacy rows that
    are never migrated stay in the DB but are never synced (defensive: never
    guess which account owns unattributed data).
    """
    with _get_conn() as conn:
        cursor = conn.execute(
            "UPDATE sessions SET user_id = ? WHERE user_id IS NULL",
            (user_id,),
        )
        return cursor.rowcount


def count_orphan_rows() -> int:
    """Count pre-Phase-1 rows that haven't been attributed to any account."""
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT COUNT(*) FROM sessions WHERE user_id IS NULL"
        ).fetchone()
    return int(row[0]) if row else 0
