import sqlite3
import uuid
import time
import os

DB_PATH = os.path.join(os.path.expanduser("~"), ".deckd", "sessions.db")


def _get_conn():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id   TEXT PRIMARY KEY,
            game_exe     TEXT NOT NULL,
            game_name    TEXT NOT NULL,
            started_at   INTEGER NOT NULL,
            ended_at     INTEGER,
            duration_sec INTEGER,
            label        TEXT DEFAULT 'tracked',
            synced       INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    return conn


def open_session(game_exe: str, game_name: str) -> str:
    session_id = str(uuid.uuid4())
    with _get_conn() as conn:
        conn.execute(
            "INSERT INTO sessions (session_id, game_exe, game_name, started_at) VALUES (?, ?, ?, ?)",
            (session_id, game_exe, game_name, int(time.time())),
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


def get_unsynced() -> list[dict]:
    with _get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM sessions WHERE synced = 0 AND ended_at IS NOT NULL"
        ).fetchall()
    cols = ["session_id", "game_exe", "game_name", "started_at", "ended_at", "duration_sec", "label", "synced"]
    return [dict(zip(cols, row)) for row in rows]


def mark_synced(session_id: str):
    with _get_conn() as conn:
        conn.execute("UPDATE sessions SET synced = 1 WHERE session_id = ?", (session_id,))
