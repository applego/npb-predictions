#!/usr/bin/env python3
"""Skip automatic ingestion only for a complete, explicitly final published season."""
import argparse
import json
from pathlib import Path


def completed(folder: Path, year: int) -> bool:
    path = folder / f"public-results-{year}.json"
    if not path.exists():
        return False
    data = json.loads(path.read_text())
    if data.get("version") != 1 or data.get("year") != year:
        return False
    rows = data.get("standings", [])
    if len(rows) != 12 or any(row.get("isFinal") is not True for row in rows):
        return False
    for league in ("central", "pacific"):
        selected = [row for row in rows if row.get("league") == league]
        if len(selected) != 6 or {row.get("rank") for row in selected} != set(range(1, 7)) or len({row.get("teamName") for row in selected}) != 6:
            return False
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--data", type=Path, default=Path("data"))
    args = parser.parse_args()
    print(f"completed={str(completed(args.data, args.year)).lower()}")
