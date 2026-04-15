#!/usr/bin/env python3
"""
Validate NPB Predictions data integrity.
Exit code 0 = all checks pass, 1 = failures found.
Run this in CI/CD before deploy.
"""

import sqlite3
import sys
import os

DB_PATH = os.path.join(
    os.path.dirname(__file__), "..",
    ".wrangler/state/v3/d1/miniflare-D1DatabaseObject",
    "ebe107f426ba83322c62809723b53c3169b31ddb2289bafa01897cad3061e808.sqlite"
)

CENTRAL_TEAMS = {"巨人", "阪神", "DeNA", "広島", "中日", "ヤクルト"}
PACIFIC_TEAMS = {"ソフトバンク", "日本ハム", "ロッテ", "楽天", "西武", "オリックス"}
ALL_TEAMS = CENTRAL_TEAMS | PACIFIC_TEAMS

# Verified actual standings from ohtashp.com/topics/baseball_yosou/rank.html
VERIFIED_STANDINGS = {
    2014: {"central": ["巨人", "阪神", "広島", "中日", "DeNA", "ヤクルト"], "pacific": ["ソフトバンク", "オリックス", "ロッテ", "日本ハム", "西武", "楽天"]},
    2015: {"central": ["ヤクルト", "巨人", "阪神", "広島", "中日", "DeNA"], "pacific": ["ソフトバンク", "日本ハム", "ロッテ", "西武", "オリックス", "楽天"]},
    2016: {"central": ["広島", "巨人", "DeNA", "阪神", "ヤクルト", "中日"], "pacific": ["日本ハム", "ソフトバンク", "ロッテ", "西武", "楽天", "オリックス"]},
    2017: {"central": ["広島", "阪神", "DeNA", "巨人", "中日", "ヤクルト"], "pacific": ["ソフトバンク", "西武", "楽天", "オリックス", "日本ハム", "ロッテ"]},
    2018: {"central": ["広島", "ヤクルト", "巨人", "DeNA", "中日", "阪神"], "pacific": ["西武", "ソフトバンク", "日本ハム", "オリックス", "ロッテ", "楽天"]},
    2019: {"central": ["巨人", "DeNA", "阪神", "広島", "ヤクルト", "中日"], "pacific": ["西武", "ソフトバンク", "楽天", "日本ハム", "ロッテ", "オリックス"]},
    2020: {"central": ["巨人", "阪神", "中日", "DeNA", "広島", "ヤクルト"], "pacific": ["ソフトバンク", "ロッテ", "西武", "楽天", "日本ハム", "オリックス"]},
    2021: {"central": ["ヤクルト", "阪神", "巨人", "広島", "中日", "DeNA"], "pacific": ["オリックス", "ソフトバンク", "楽天", "西武", "日本ハム", "ロッテ"]},
    2022: {"central": ["ヤクルト", "DeNA", "阪神", "巨人", "広島", "中日"], "pacific": ["オリックス", "ソフトバンク", "西武", "楽天", "ロッテ", "日本ハム"]},
    2023: {"central": ["阪神", "広島", "DeNA", "巨人", "ヤクルト", "中日"], "pacific": ["オリックス", "ソフトバンク", "ロッテ", "楽天", "西武", "日本ハム"]},
    2024: {"central": ["巨人", "阪神", "DeNA", "広島", "ヤクルト", "中日"], "pacific": ["ソフトバンク", "日本ハム", "ロッテ", "楽天", "オリックス", "西武"]},
    2025: {"central": ["阪神", "DeNA", "巨人", "中日", "広島", "ヤクルト"], "pacific": ["ソフトバンク", "日本ハム", "オリックス", "楽天", "西武", "ロッテ"]},
}

errors = []

def check(condition, msg):
    if not condition:
        errors.append(f"FAIL: {msg}")
        print(f"  ❌ {msg}")
    else:
        print(f"  ✅ {msg}")


def main():
    if not os.path.exists(DB_PATH):
        print(f"DB not found: {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    print("\n=== 1. Seasons check ===")
    cur.execute("SELECT year FROM seasons ORDER BY year")
    db_years = [r[0] for r in cur.fetchall()]
    check(len(db_years) >= 12, f"At least 12 seasons exist (found {len(db_years)})")
    for y in range(2014, 2027):
        check(y in db_years, f"Season {y} exists")

    print("\n=== 2. Actual standings integrity ===")
    for year, expected in VERIFIED_STANDINGS.items():
        cur.execute("""
            SELECT a.league, a.rank, a.team_name
            FROM actual_team_standings a JOIN seasons s ON a.season_id=s.id
            WHERE s.year=? ORDER BY a.league, a.rank
        """, (year,))
        rows = cur.fetchall()

        # Check count
        check(len(rows) == 12, f"{year}: has 12 standings entries (found {len(rows)})")

        for league in ["central", "pacific"]:
            league_rows = [(r[1], r[2]) for r in rows if r[0] == league]
            expected_teams = expected[league]

            for rank, team in league_rows:
                expected_team = expected_teams[rank - 1] if rank <= len(expected_teams) else "?"
                check(
                    team == expected_team,
                    f"{year} {league} {rank}位: {team} == {expected_team}"
                )

    print("\n=== 3. Team names validity ===")
    cur.execute("SELECT DISTINCT team_name FROM ranking_picks")
    pick_teams = {r[0] for r in cur.fetchall()}
    for team in pick_teams:
        check(team in ALL_TEAMS, f"ranking_pick team '{team}' is valid")

    cur.execute("SELECT DISTINCT team_name FROM actual_team_standings")
    standing_teams = {r[0] for r in cur.fetchall()}
    for team in standing_teams:
        check(team in ALL_TEAMS, f"actual_standing team '{team}' is valid")

    print("\n=== 4. Predictions per season ===")
    cur.execute("""
        SELECT s.year, COUNT(p.id)
        FROM seasons s LEFT JOIN predictions p ON p.season_id=s.id
        GROUP BY s.year ORDER BY s.year
    """)
    for year, count in cur.fetchall():
        if year <= 2025:
            check(count > 0, f"{year}: has predictions ({count})")
        else:
            print(f"  ℹ️  {year}: {count} predictions (active season)")

    print("\n=== 5. Ranking picks completeness ===")
    cur.execute("""
        SELECT p.id, u.name, s.year,
               SUM(CASE WHEN rp.league='central' THEN 1 ELSE 0 END) as c_count,
               SUM(CASE WHEN rp.league='pacific' THEN 1 ELSE 0 END) as p_count
        FROM predictions p
        JOIN users u ON p.user_id=u.id
        JOIN seasons s ON p.season_id=s.id
        LEFT JOIN ranking_picks rp ON rp.prediction_id=p.id
        GROUP BY p.id
        HAVING c_count NOT IN (0, 6) OR p_count NOT IN (0, 6)
    """)
    bad_picks = cur.fetchall()
    check(len(bad_picks) == 0, f"All predictions have 0 or 6 picks per league ({len(bad_picks)} invalid)")
    for bp in bad_picks[:5]:
        print(f"    → {bp[1]} ({bp[2]}): central={bp[3]}, pacific={bp[4]}")

    print("\n=== 6. Non-commentator leak check ===")
    NON_COMMENTATOR_PATTERNS = [
        '%最終順位%', '%AI%', '%ChatGPT%', '%GPT%', '%Gemini%',
        '%編集部%', '%記者%均%', '%AERA%', '%朝日新聞%', '%SPAIA%',
        '%読者%', '%アンケート%', '%平均%', '%合計%', '%データ%',
    ]
    leaked = []
    for pat in NON_COMMENTATOR_PATTERNS:
        cur.execute("SELECT id, name FROM users WHERE name LIKE ? AND role='commentator'", (pat,))
        leaked.extend(cur.fetchall())
    check(len(leaked) == 0, f"No non-commentator entries with role=commentator ({len(leaked)} found)")
    for l in leaked[:10]:
        print(f"    → id={l[0]} name='{l[1]}' should be role=system")

    print("\n=== 7. Source/出典 validation ===")

    # 7a. Source coverage rate
    cur.execute("SELECT COUNT(*) FROM users WHERE role='commentator'")
    total_commentators = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM users WHERE role='commentator' AND source IS NOT NULL AND source != ''")
    with_source = cur.fetchone()[0]
    coverage = round(with_source / max(total_commentators, 1) * 100, 1)
    check(coverage >= 80, f"Source coverage: {with_source}/{total_commentators} ({coverage}%) — target ≥80%")

    # 7b. Known valid source categories
    VALID_SOURCE_KEYWORDS = [
        # Direct categories
        "YouTube", "Web", "テレビ", "新聞", "ラジオ", "雑誌",
        # Newspapers
        "日刊スポーツ", "スポーツ報知", "東京スポーツ", "デイリースポーツ", "デイリー",
        "スポニチ", "サンスポ", "サンケイスポーツ", "中日スポーツ",
        "西日本スポーツ", "産経", "報知", "夕刊フジ", "朝日", "日経", "読売",
        # Magazines
        "週刊ベースボール", "週ベ", "週べ", "週刊ポスト", "週刊大衆", "Number", "AERA",
        # TV
        "NHK", "TBS", "フジ", "テレビ朝日", "日テレ", "日本テレビ", "MBS", "テレビ東京",
        "ABC", "CBC", "RCC", "関西テレビ", "関テレ", "東海テレビ", "中京",
        "名古屋テレビ", "サンテレビ", "仙台放送", "テレ玉", "朝日放送",
        "BS", "スカパー", "プロ野球ニュース", "Going",
        # Radio
        "文化放送", "ニッポン放送", "ラジオ大阪", "MBSラジオ", "ABCラジオ",
        "STVラジオ", "HBCラジオ", "CBCラジオ",
        # Web
        "web Sportiva", "Sportiva", "SPAIA", "Full-Count", "FullC", "HOMINIS",
        "Yahoo!", "カナコロ", "ガッツリ",
        # Abbreviations
        "週BB", "HBC", "HOME", "Get Sports", "おはよう朝日",
        "OHK", "TSS", "KBC", "RAB", "BBC",
        # Roles (valid but not media)
        "デスク", "担当", "編集",
    ]
    VALID_SOURCE_PREFIXES = VALID_SOURCE_KEYWORDS  # backward compat

    cur.execute("SELECT id, name, source FROM users WHERE role='commentator' AND source IS NOT NULL AND source != ''")
    bad_sources = []
    for row in cur.fetchall():
        uid, uname, source = row
        # Check if source contains any known keyword
        matched = any(kw in source for kw in VALID_SOURCE_KEYWORDS)
        # Also match M/DD date-only patterns
        if not matched:
            import re as _re
            matched = bool(_re.match(r'^\d{1,2}/\d{1,2}', source))
        if not matched:
            bad_sources.append((uid, uname, source))

    if bad_sources:
        print(f"  ⚠️  {len(bad_sources)} sources don't match known patterns (may be valid, review manually):")
        for uid, uname, src in bad_sources[:10]:
            print(f"    → id={uid} {uname}: '{src}'")
    else:
        print(f"  ✅ All {with_source} sources match known patterns")

    # 7c. No source has suspicious characters
    cur.execute("SELECT id, name, source FROM users WHERE role='commentator' AND (source LIKE '%<script%' OR source LIKE '%javascript:%' OR source LIKE '%onclick%')")
    xss_sources = cur.fetchall()
    check(len(xss_sources) == 0, f"No XSS in source fields ({len(xss_sources)} found)")

    # 7d. Sources with dates should have valid date format (M/DD or YYYY)
    import re
    cur.execute("SELECT source FROM users WHERE role='commentator' AND source IS NOT NULL")
    date_pattern = re.compile(r'\((\d{1,2}/\d{1,2})')
    bad_dates = []
    for (source,) in cur.fetchall():
        m = date_pattern.search(source)
        if m:
            parts = m.group(1).split("/")
            month, day = int(parts[0]), int(parts[1])
            if month < 1 or month > 12 or day < 1 or day > 31:
                bad_dates.append(source)
    check(len(bad_dates) == 0, f"All source dates have valid M/DD format ({len(bad_dates)} invalid)")

    print("\n=== 8. No duplicate predictions ===")
    cur.execute("""
        SELECT u.name, s.year, COUNT(*)
        FROM predictions p
        JOIN users u ON p.user_id=u.id
        JOIN seasons s ON p.season_id=s.id
        GROUP BY p.user_id, p.season_id
        HAVING COUNT(*) > 1
    """)
    dupes = cur.fetchall()
    check(len(dupes) == 0, f"No duplicate predictions per user/season ({len(dupes)} found)")

    conn.close()

    print(f"\n{'='*50}")
    if errors:
        print(f"FAILED: {len(errors)} error(s)")
        sys.exit(1)
    else:
        print("ALL CHECKS PASSED ✅")
        sys.exit(0)


if __name__ == "__main__":
    main()
