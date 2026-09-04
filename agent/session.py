import sqlite3
import threading
import uuid
import time
import os

DB_PATH = os.path.join(os.path.expanduser("~"), ".deckd", "sessions.db")

_SCHEMA_VERSION = 1
_migration_lock = threading.Lock()
_migrated_for_path: str | None = None


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
    version = conn.execute("PRAGMA user_version").fetchone()[0]
    if version < _SCHEMA_VERSION:
        cols = {row[1] for row in conn.execute("PRAGMA table_info(sessions)")}
        if "user_id" not in cols:
            try:
                conn.execute("ALTER TABLE sessions ADD COLUMN user_id TEXT")
            except sqlite3.OperationalError:
                # Another process (or a prior partial migration) already added it.
                pass
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
    """Return closed, unsynced sessions belonging to a specific account."""
    with _get_conn() as conn:
        rows = conn.execute(
            "SELECT session_id, game_exe, game_name, started_at, ended_at, "
            "duration_sec, label, synced, user_id "
            "FROM sessions WHERE synced = 0 AND ended_at IS NOT NULL AND user_id = ?",
            (user_id,),
        ).fetchall()
    return [dict(zip(_COLS, row)) for row in rows]


def get_pending_user_ids() -> list[str]:
    """Distinct user_ids that have at least one closed, unsynced session queued."""
    with _get_conn() as conn:
        rows = conn.execute(
            "SELECT DISTINCT user_id FROM sessions "
            "WHERE synced = 0 AND ended_at IS NOT NULL AND user_id IS NOT NULL"
        ).fetchall()
    return [r[0] for r in rows]


def mark_synced(session_id: str):
    with _get_conn() as conn:
        conn.execute("UPDATE sessions SET synced = 1 WHERE session_id = ?", (session_id,))


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
