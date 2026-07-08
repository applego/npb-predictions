#!/usr/bin/env python3
"""Run data validation against the D1 database created with WRANGLER_PERSIST_TO."""

from pathlib import Path
import os
import sqlite3
import subprocess
import sys


def has_table(db_path: Path, table_name: str) -> bool:
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
            (table_name,),
        )
        return cur.fetchone() is not None
    except sqlite3.DatabaseError:
        return False
    finally:
        try:
            conn.close()
        except UnboundLocalError:
            pass


def candidate_paths(persist_root: Path):
    for d1_dir in (
        persist_root / "v3/d1/miniflare-D1DatabaseObject",
        persist_root / "state/v3/d1/miniflare-D1DatabaseObject",
    ):
        if d1_dir.exists():
            yield from sorted(
                path for path in d1_dir.glob("*.sqlite") if path.name != "metadata.sqlite"
            )


def main() -> int:
    persist_to = os.environ.get("WRANGLER_PERSIST_TO")
    if not persist_to:
        print("WRANGLER_PERSIST_TO is required", file=sys.stderr)
        return 1

    for path in candidate_paths(Path(persist_to)):
        if has_table(path, "seasons"):
            env = dict(os.environ, NPB_VALIDATE_DB_PATH=str(path))
            return subprocess.run(
                [sys.executable, "scripts/validate-data.py"],
                env=env,
                check=False,
            ).returncode

    print(f"No seeded D1 SQLite database found under {persist_to}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
