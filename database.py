"""SQLite storage for StudySmart AI: user accounts and per-user history (built-in sqlite3)."""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "studysmart.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS history (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER,
                mode       TEXT NOT NULL,
                preview    TEXT NOT NULL,
                input_text TEXT NOT NULL,
                result     TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        # Upgrade an older database (from before login existed) that has no user_id column
        columns = [row["name"] for row in conn.execute("PRAGMA table_info(history)")]
        if "user_id" not in columns:
            conn.execute("ALTER TABLE history ADD COLUMN user_id INTEGER")

        # Upgrade accounts created before password recovery existed
        user_columns = [row["name"] for row in conn.execute("PRAGMA table_info(users)")]
        if "security_question" not in user_columns:
            conn.execute("ALTER TABLE users ADD COLUMN security_question TEXT")
        if "security_answer_hash" not in user_columns:
            conn.execute("ALTER TABLE users ADD COLUMN security_answer_hash TEXT")

        # Email address for password reset links (unique, but optional for older accounts)
        if "email" not in user_columns:
            conn.execute("ALTER TABLE users ADD COLUMN email TEXT")
        conn.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email COLLATE NOCASE)"
        )


# ---------- users ----------

def create_user(username, email, password_hash):
    """Returns the new user's id. Raises sqlite3.IntegrityError if username or email exists."""
    with get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            (username, email, password_hash),
        )
        return cur.lastrowid


def get_user_by_username(username):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    return dict(row) if row else None


def get_user_by_id(user_id):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


def get_user_by_email(email):
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE email = ? COLLATE NOCASE", (email,)
        ).fetchone()
    return dict(row) if row else None


def update_password(user_id, password_hash):
    with get_connection() as conn:
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (password_hash, user_id))


def set_email(user_id, email):
    """Raises sqlite3.IntegrityError if another account already uses this email."""
    with get_connection() as conn:
        conn.execute("UPDATE users SET email = ? WHERE id = ?", (email, user_id))


# ---------- history (always scoped to one user) ----------

def save_history(user_id, mode, input_text, result):
    preview = " ".join(input_text.split())[:90]
    with get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO history (user_id, mode, preview, input_text, result) VALUES (?, ?, ?, ?, ?)",
            (user_id, mode, preview, input_text, result),
        )
        return cur.lastrowid


def list_history(user_id, limit=30):
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, mode, preview, created_at FROM history WHERE user_id = ? ORDER BY id DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def get_history_item(user_id, item_id):
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM history WHERE id = ? AND user_id = ?", (item_id, user_id)
        ).fetchone()
    return dict(row) if row else None


def delete_history_item(user_id, item_id):
    with get_connection() as conn:
        conn.execute("DELETE FROM history WHERE id = ? AND user_id = ?", (item_id, user_id))


def clear_history(user_id):
    with get_connection() as conn:
        conn.execute("DELETE FROM history WHERE user_id = ?", (user_id,))
