#!/usr/bin/env python3
"""Import scraped commentator predictions into local D1 SQLite."""

import json
import sqlite3
import sys
import os

DB_PATH = os.path.join(
    os.path.dirname(__file__), "..",
    ".wrangler/state/v3/d1/miniflare-D1DatabaseObject",
    "ebe107f426ba83322c62809723b53c3169b31ddb2289bafa01897cad3061e808.sqlite"
)

SCRAPED_PATH = os.path.join(os.path.dirname(__file__), "scraped-predictions.json")


def main():
    with open(SCRAPED_PATH) as f:
        data = json.load(f)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Ensure seasons exist for all years
    for year_data in data:
        year = year_data["year"]
        cur.execute("SELECT id FROM seasons WHERE year = ?", (year,))
        row = cur.fetchone()
        if not row:
            is_active = 1 if year == 2026 else 0
            cur.execute(
                "INSERT INTO seasons (year, label, is_active, created_at) VALUES (?, ?, ?, unixepoch())",
                (year, f"{year}シーズン", is_active)
            )
            print(f"  Created season: {year}")

    conn.commit()

    # Get season id map
    cur.execute("SELECT year, id FROM seasons")
    season_map = {row[0]: row[1] for row in cur.fetchall()}

    total_users = 0
    total_preds = 0
    total_picks = 0

    for year_data in data:
        year = year_data["year"]
        season_id = season_map[year]

        for pred_data in year_data["predictions"]:
            name = pred_data["name"]
            variant = pred_data.get("variant")
            source = pred_data.get("source")

            # Build slug with variant suffix for uniqueness
            base_slug = name.lower().replace(" ", "-").replace("（", "").replace("）", "")
            slug = f"{base_slug}-{variant}" if variant else base_slug

            # Create or find user
            cur.execute(
                "SELECT id FROM users WHERE name = ? AND COALESCE(variant, '') = ?",
                (name, variant or "")
            )
            user_row = cur.fetchone()

            if not user_row:
                # Handle slug collision by appending a counter
                final_slug = slug
                counter = 1
                while True:
                    cur.execute("SELECT id FROM users WHERE slug = ?", (final_slug,))
                    if not cur.fetchone():
                        break
                    final_slug = f"{slug}-{counter}"
                    counter += 1

                cur.execute(
                    "INSERT INTO users (name, slug, role, source, variant, created_at) VALUES (?, ?, 'commentator', ?, ?, unixepoch())",
                    (name, final_slug, source, variant)
                )
                user_id = cur.lastrowid
                total_users += 1
            else:
                user_id = user_row[0]
                # Update source if we have new info
                if source:
                    cur.execute("UPDATE users SET source = ? WHERE id = ? AND source IS NULL", (source, user_id))

            # Create prediction (skip if already exists)
            cur.execute(
                "SELECT id FROM predictions WHERE user_id = ? AND season_id = ?",
                (user_id, season_id)
            )
            pred_row = cur.fetchone()

            if pred_row:
                continue  # Already imported

            cur.execute(
                "INSERT INTO predictions (user_id, season_id, is_locked, created_at, updated_at) VALUES (?, ?, 1, unixepoch(), unixepoch())",
                (user_id, season_id)
            )
            prediction_id = cur.lastrowid
            total_preds += 1

            # Insert ranking picks
            for league, teams in [("central", pred_data.get("central") or []), ("pacific", pred_data.get("pacific") or [])]:
                for rank, team_name in enumerate(teams, 1):
                    if team_name:
                        cur.execute(
                            "INSERT INTO ranking_picks (prediction_id, league, rank, team_name) VALUES (?, ?, ?, ?)",
                            (prediction_id, league, rank, team_name)
                        )
                        total_picks += 1

        conn.commit()
        print(f"  {year}: imported {len(year_data['predictions'])} predictions")

    conn.close()
    print(f"\nDone: {total_users} new users, {total_preds} predictions, {total_picks} ranking picks")


if __name__ == "__main__":
    main()
