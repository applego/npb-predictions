#!/usr/bin/env python3
"""
Validate that legacy source-less commentator users are covered by the role
backfill migration.
"""

from pathlib import Path
import json
import re
import sqlite3
import sys
import tempfile


WEB_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = WEB_ROOT.parent
MIGRATION_PATH = WEB_ROOT / "drizzle/0010_seed_user_roles_and_display_names.sql"
NON_COMMENTATOR_NAMES = {"優勝", "2位", "3位", "4位", "5位", "6位"}


def commentator_source_less_slugs():
    data = json.loads((REPO_ROOT / "data/commentator_predictions.json").read_text())
    year_groups = {}

    for year_str, year_data in data.items():
        year = int(year_str)
        for league in ("central", "pacific"):
            for entry in year_data.get(league, []) or []:
                name = entry["name"]
                variant = entry.get("variant") or ""
                source = entry.get("source") or ""
                key = f"{name}|{variant}"
                year_groups.setdefault(year, {}).setdefault(key, {})
                year_groups[year][key].setdefault(
                    league,
                    {"name": name, "variant": variant, "source": source},
                )

    identities = {}
    for name_map in year_groups.values():
        for key, league_map in name_map.items():
            identities.setdefault(key, next(iter(league_map.values())))

    slugs = set()
    for identity in identities.values():
        if identity["source"] or identity["variant"]:
            continue
        if identity["name"] in NON_COMMENTATOR_NAMES:
            continue
        slugs.add(re.sub(r"\s+", "-", identity["name"]))
    return slugs


def migration_slug_whitelist():
    sql = MIGRATION_PATH.read_text()
    slug_section = sql.split("OR `slug` IN (", 1)[1].split(")", 1)[0]
    return set(re.findall(r"'([^']+)'", slug_section))


def apply_migration_fixture():
    with tempfile.TemporaryDirectory(prefix="npb-source-less-backfill-") as temp_dir:
        db_path = Path(temp_dir) / "fixture.sqlite"
        conn = sqlite3.connect(db_path)
        conn.executescript("""
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                slug TEXT NOT NULL,
                role TEXT DEFAULT 'friend' NOT NULL,
                source TEXT,
                variant TEXT
            );
            INSERT INTO users (id, name, slug, role, source, variant)
            VALUES (1, '福留孝介', '福留孝介', 'friend', NULL, NULL);
            INSERT INTO users (id, name, slug, role, source, variant)
            VALUES (2, '優勝', '優勝', 'friend', NULL, NULL);
        """)
        conn.executescript(MIGRATION_PATH.read_text().replace("--> statement-breakpoint", ";"))
        roles = dict(conn.execute("SELECT slug, role FROM users").fetchall())
        conn.close()
    return roles


def main():
    expected = commentator_source_less_slugs()
    whitelist = migration_slug_whitelist()
    missing = sorted(expected - whitelist)
    unexpected = sorted(NON_COMMENTATOR_NAMES & whitelist)
    roles = apply_migration_fixture()

    failures = []
    if missing:
        failures.append(f"missing source-less commentator slugs: {missing[:10]}")
    if unexpected:
        failures.append(f"non-commentator slugs in whitelist: {unexpected}")
    if roles.get("福留孝介") != "commentator":
        failures.append("福留孝介 did not backfill to commentator")
    if roles.get("優勝") == "commentator":
        failures.append("優勝 backfilled to commentator")

    if failures:
        for failure in failures:
            print(f"  [FAIL] {failure}")
        sys.exit(1)

    print(f"  [OK] source-less commentator backfill coverage: {len(expected)} slugs")


if __name__ == "__main__":
    main()
