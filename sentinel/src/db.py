"""
sentinel/src/db.py
==================
Shared psycopg2 connection context manager.
All writes use ON CONFLICT DO NOTHING for idempotency.
"""
import os
from contextlib import contextmanager
import psycopg2
import psycopg2.extras

# Accept both psycopg2-style and JDBC-style DATABASE_URL
# (JDBC: jdbc:postgresql://... -> strip prefix)
_raw = os.environ.get(
    "DATABASE_URL",
    "postgresql://sentinel:sentinel@localhost:5432/sentinel"
)
DATABASE_URL = _raw.replace("jdbc:postgresql", "postgresql") if _raw.startswith("jdbc:") else _raw


@contextmanager
def get_connection():
    """Yields a psycopg2 connection that auto-commits or rolls back on error."""
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def execute_batch(conn, sql: str, rows: list) -> int:
    """Execute a parameterized INSERT for a batch of rows. Returns row count."""
    if not rows:
        return 0
    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(cur, sql, rows, page_size=100)
    return len(rows)
