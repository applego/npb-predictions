#!/usr/bin/env python3
"""
Validate NPB Predictions data integrity.

The validator prefers a real local D1 SQLite database when one is available.
For clean CI environments it bootstraps a temporary SQLite database from the
checked-in migrations and SQL seed so `npm run ci` is reproducible.
"""

from pathlib import Path
import os
import sqlite3
import sys
import tempfile


WEB_ROOT = Path(__file__).resolve().parents[1]
D1_DIR = WEB_ROOT / ".wrangler/state/v3/d1/miniflare-D1DatabaseObject"
LEGACY_DB_NAME = "ebe107f426ba83322c62809723b53c3169b31ddb2289bafa01897cad3061e808.sqlite"
CURRENT_RELEASE_YEAR = 2026

TEAM_ALIASES = {
    "巨人": "読売ジャイアンツ",
    "阪神": "阪神タイガース",
    "DeNA": "横浜DeNAベイスターズ",
    "広島": "広島東洋カープ",
    "中日": "中日ドラゴンズ",
    "ヤクルト": "東京ヤクルトスワローズ",
    "オリックス": "オリックス・バファローズ",
    "ソフトバンク": "福岡ソフトバンクホークス",
    "ロッテ": "千葉ロッテマリーンズ",
    "楽天": "東北楽天ゴールデンイーグルス",
    "西武": "埼玉西武ライオンズ",
    "日本ハム": "北海道日本ハムファイターズ",
}
VALID_TEAMS = set(TEAM_ALIASES) | set(TEAM_ALIASES.values())

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
        print(f"  [FAIL] {msg}")
    else:
        print(f"  [OK] {msg}")


def canonical_team(team):
    return TEAM_ALIASES.get(team, team)


def has_table(db_path, table_name):
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


def candidate_db_paths():
    env_path = os.environ.get("NPB_VALIDATE_DB_PATH")
    if env_path:
        yield Path(env_path)

    yield D1_DIR / LEGACY_DB_NAME

    if D1_DIR.exists():
        for path in sorted(D1_DIR.glob("*.sqlite")):
            if path.name != "metadata.sqlite":
                yield path


def apply_sql_file(conn, path):
    sql = path.read_text()
    for chunk in sql.split("--> statement-breakpoint"):
        chunk = chunk.strip()
        if chunk:
            conn.executescript(chunk)


def bootstrap_temp_db():
    temp_dir = tempfile.TemporaryDirectory(prefix="npb-validate-")
    db_path = Path(temp_dir.name) / "ci.sqlite"
    conn = sqlite3.connect(db_path)

    for migration in sorted((WEB_ROOT / "drizzle").glob("*.sql")):
        apply_sql_file(conn, migration)

    apply_sql_file(conn, WEB_ROOT / "src/db/seed-commentators.sql")

    # Fresh DBs run migrations before seed data. Reapply the team-name data
    # normalization migration so local CI checks the canonical post-migration form.
    normalize_migration = WEB_ROOT / "drizzle/0006_normalize_team_names.sql"
    if normalize_migration.exists():
        apply_sql_file(conn, normalize_migration)

    conn.commit()
    print(f"Using temporary CI database: {db_path}")
    return conn, temp_dir


def open_database():
    seen = set()
    for path in candidate_db_paths():
        if path in seen:
            continue
        seen.add(path)
        if path.exists() and has_table(path, "seasons"):
            print(f"Using database: {path}")
            return sqlite3.connect(path), None
        if path.exists():
            print(f"Skipping database without expected schema: {path}")

    return bootstrap_temp_db()


def validate_role_backfill_migration():
    with tempfile.TemporaryDirectory(prefix="npb-role-backfill-") as temp_dir:
        db_path = Path(temp_dir) / "role-backfill.sqlite"
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
            CREATE TABLE predictions (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                season_id INTEGER NOT NULL
            );
            CREATE TABLE ranking_picks (
                id INTEGER PRIMARY KEY,
                prediction_id INTEGER NOT NULL
            );
            INSERT INTO users (id, name, slug, role, source, variant)
            VALUES (9001, '旧解説者', 'legacy-commentator', 'friend', 'スポーツ紙', NULL);
            INSERT INTO users (id, name, slug, role)
            VALUES (9002, '熊谷', 'kumagae', 'friend');
            INSERT INTO users (id, name, slug, role)
            VALUES (9003, '権藤 博', 'kondo-hiroshi', 'friend');
            INSERT INTO users (id, name, slug, role, source, variant)
            VALUES (9004, 'AERA dot.', 'aera-dot', 'friend', 'AERA dot.(1/1', NULL);
            INSERT INTO users (id, name, slug, role, source, variant)
            VALUES (9005, '記者記事', 'reporter-article', 'friend', 'スポーツ紙', NULL);
            INSERT INTO users (id, name, slug, role, source, variant)
            VALUES (9006, '一般参加者', 'multi-season-friend', 'friend', NULL, NULL);
            INSERT INTO predictions (id, user_id, season_id)
            VALUES (9103, 9003, 2026);
            INSERT INTO predictions (id, user_id, season_id)
            VALUES (9106, 9006, 2025);
            INSERT INTO predictions (id, user_id, season_id)
            VALUES (9107, 9006, 2026);
            INSERT INTO ranking_picks (id, prediction_id)
            VALUES (9203, 9103);
            INSERT INTO ranking_picks (id, prediction_id)
            VALUES (9206, 9106);
            INSERT INTO ranking_picks (id, prediction_id)
            VALUES (9207, 9107);
        """)
        apply_sql_file(conn, WEB_ROOT / "drizzle/0010_seed_user_roles_and_display_names.sql")

        cur = conn.cursor()
        cur.execute("SELECT role FROM users WHERE slug='legacy-commentator'")
        legacy_role = cur.fetchone()[0]
        cur.execute("SELECT role FROM users WHERE slug='kumagae'")
        friend_role = cur.fetchone()[0]
        cur.execute("SELECT role FROM users WHERE slug='kondo-hiroshi'")
        seed_commentator_role = cur.fetchone()[0]
        cur.execute("SELECT role FROM users WHERE slug='aera-dot'")
        outlet_role = cur.fetchone()[0]
        cur.execute("SELECT role FROM users WHERE slug='reporter-article'")
        reporter_article_role = cur.fetchone()[0]
        cur.execute("SELECT role FROM users WHERE slug='multi-season-friend'")
        multi_season_friend_role = cur.fetchone()[0]
        conn.close()

    check(
        legacy_role == "commentator",
        "0010 backfills source-backed legacy commentator users",
    )
    check(
        friend_role == "friend",
        "0010 keeps known friend seed users out of commentator rankings",
    )
    check(
        seed_commentator_role == "commentator",
        "0010 backfills single-season seed commentator users",
    )
    check(
        outlet_role != "commentator",
        "0010 keeps outlet/source rows out of commentator rankings",
    )
    check(
        reporter_article_role != "commentator",
        "0010 keeps reporter article rows out of commentator rankings",
    )
    check(
        multi_season_friend_role == "friend",
        "0010 keeps multi-season friend users out of commentator rankings",
    )


def validate_seed_team_normalization():
    with tempfile.TemporaryDirectory(prefix="npb-seed-normalize-") as temp_dir:
        db_path = Path(temp_dir) / "seed-normalize.sqlite"
        conn = sqlite3.connect(db_path)

        for migration in sorted((WEB_ROOT / "drizzle").glob("*.sql")):
            apply_sql_file(conn, migration)

        apply_sql_file(conn, WEB_ROOT / "src/db/seed-commentators.sql")

        short_team_names = tuple(sorted(TEAM_ALIASES))
        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT COUNT(*)
            FROM ranking_picks
            WHERE team_name IN ({','.join('?' for _ in short_team_names)})
            """,
            short_team_names,
        )
        short_ranking_picks = cur.fetchone()[0]
        cur.execute(
            f"""
            SELECT COUNT(*)
            FROM title_picks
            WHERE team_name IN ({','.join('?' for _ in short_team_names)})
            """,
            short_team_names,
        )
        short_title_picks = cur.fetchone()[0]
        conn.close()

    check(
        short_ranking_picks == 0,
        "seed-commentators leaves no short team names in ranking_picks",
    )
    check(
        short_title_picks == 0,
        "seed-commentators leaves no short team names in title_picks",
    )


def main():
    conn, temp_dir = open_database()
    cur = conn.cursor()

    print("\n=== 1. Seasons check ===")
    cur.execute("SELECT year, is_active FROM seasons ORDER BY year")
    season_rows = cur.fetchall()
    db_years = [r[0] for r in season_rows]
    active_years = [year for year, is_active in season_rows if is_active]
    check(CURRENT_RELEASE_YEAR in db_years, f"Release season {CURRENT_RELEASE_YEAR} exists")
    check(CURRENT_RELEASE_YEAR in active_years, f"Release season {CURRENT_RELEASE_YEAR} is active")
    check(len(active_years) == 1, f"Exactly one active season ({len(active_years)} found)")
    cur.execute("SELECT year FROM seasons WHERE is_active=0 AND lock_date IS NULL ORDER BY year")
    inactive_without_lock = [str(r[0]) for r in cur.fetchall()]
    check(
        len(inactive_without_lock) == 0,
        "Inactive seasons have lock_date set so late submissions cannot enter competitive scoring"
        + (f" (missing: {', '.join(inactive_without_lock)})" if inactive_without_lock else ""),
    )
    print(f"  [INFO] Seasons present: {', '.join(str(y) for y in db_years)}")

    print("\n=== 2. Actual standings integrity ===")
    checked_standings_years = 0
    for year in sorted(set(db_years) & set(VERIFIED_STANDINGS)):
        cur.execute("""
            SELECT a.league, a.rank, a.team_name
            FROM actual_team_standings a JOIN seasons s ON a.season_id=s.id
            WHERE s.year=? ORDER BY a.league, a.rank
        """, (year,))
        rows = cur.fetchall()
        if not rows:
            print(f"  [INFO] {year}: no actual standings in this database; skipped")
            continue

        checked_standings_years += 1
        check(len(rows) == 12, f"{year}: has 12 standings entries (found {len(rows)})")

        for league in ["central", "pacific"]:
            league_rows = [(r[1], r[2]) for r in rows if r[0] == league]
            expected_teams = VERIFIED_STANDINGS[year][league]

            for rank, team in league_rows:
                expected_team = expected_teams[rank - 1] if rank <= len(expected_teams) else "?"
                check(
                    canonical_team(team) == canonical_team(expected_team),
                    f"{year} {league} {rank}位: {team} == {expected_team}"
                )

    if checked_standings_years == 0:
        print("  [INFO] No historical actual standings available; release seed check continues")

    print("\n=== 3. Team names validity ===")
    cur.execute("SELECT DISTINCT team_name FROM ranking_picks")
    pick_teams = {r[0] for r in cur.fetchall()}
    for team in sorted(pick_teams):
        check(team in VALID_TEAMS, f"ranking_pick team '{team}' is valid")

    cur.execute("SELECT DISTINCT team_name FROM actual_team_standings")
    standing_teams = {r[0] for r in cur.fetchall()}
    for team in sorted(standing_teams):
        check(team in VALID_TEAMS, f"actual_standing team '{team}' is valid")

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
            check(count > 0, f"{year}: has active-season predictions ({count})")

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
        print(f"    -> {bp[1]} ({bp[2]}): central={bp[3]}, pacific={bp[4]}")

    print("\n=== 6. Non-commentator leak check ===")
    non_commentator_patterns = [
        '%最終順位%', '%AI%', '%ChatGPT%', '%GPT%', '%Gemini%',
        '%編集部%', '%記者%', '%AERA%', '%朝日新聞%', '%SPAIA%',
        '%読者%', '%アンケート%', '%平均%', '%合計%', '%データ%',
    ]
    leaked = []
    for pat in non_commentator_patterns:
        cur.execute("SELECT id, name FROM users WHERE name LIKE ? AND role='commentator'", (pat,))
        leaked.extend(cur.fetchall())
    check(len(leaked) == 0, f"No non-commentator entries with role=commentator ({len(leaked)} found)")
    for item in leaked[:10]:
        print(f"    -> id={item[0]} name='{item[1]}' should be role=system")

    print("\n=== 7. Role backfill migration ===")
    validate_role_backfill_migration()

    print("\n=== 8. Seed team normalization ===")
    validate_seed_team_normalization()

    print("\n=== 9. Source validation ===")
    cur.execute("SELECT COUNT(*) FROM users WHERE role='commentator'")
    total_commentators = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM users WHERE role='commentator' AND source IS NOT NULL AND source != ''")
    with_source = cur.fetchone()[0]
    coverage = round(with_source / max(total_commentators, 1) * 100, 1)
    if with_source == 0:
        print(f"  [INFO] Source coverage not enforced for source-less SQL seed: {with_source}/{total_commentators}")
    else:
        check(coverage >= 80, f"Source coverage: {with_source}/{total_commentators} ({coverage}%) - target >=80%")

    valid_source_keywords = [
        "YouTube", "Web", "テレビ", "新聞", "ラジオ", "雑誌",
        "日刊スポーツ", "スポーツ報知", "東京スポーツ", "デイリースポーツ", "デイリー",
        "スポニチ", "サンスポ", "サンケイスポーツ", "中日スポーツ",
        "西日本スポーツ", "産経", "報知", "夕刊フジ", "朝日", "日経", "読売",
        "週刊ベースボール", "週ベ", "週べ", "週刊ポスト", "週刊大衆", "Number", "AERA",
        "NHK", "TBS", "フジ", "テレビ朝日", "日テレ", "日本テレビ", "MBS", "テレビ東京",
        "ABC", "CBC", "RCC", "関西テレビ", "関テレ", "東海テレビ", "中京",
        "名古屋テレビ", "サンテレビ", "仙台放送", "テレ玉", "朝日放送",
        "BS", "スカパー", "プロ野球ニュース", "Going",
        "文化放送", "ニッポン放送", "ラジオ大阪", "MBSラジオ", "ABCラジオ",
        "STVラジオ", "HBCラジオ", "CBCラジオ",
        "web Sportiva", "Sportiva", "SPAIA", "Full-Count", "FullC", "HOMINIS",
        "Yahoo!", "カナコロ", "ガッツリ",
        "週BB", "HBC", "HOME", "Get Sports", "おはよう朝日",
        "OHK", "TSS", "KBC", "RAB", "BBC",
        "デスク", "担当", "編集",
    ]

    cur.execute("SELECT id, name, source FROM users WHERE role='commentator' AND source IS NOT NULL AND source != ''")
    bad_sources = []
    for uid, uname, source in cur.fetchall():
        matched = any(kw in source for kw in valid_source_keywords)
        if not matched:
            import re as _re
            matched = bool(_re.match(r'^\d{1,2}/\d{1,2}', source))
        if not matched:
            bad_sources.append((uid, uname, source))

    if bad_sources:
        print(f"  [WARN] {len(bad_sources)} sources do not match known patterns; review manually:")
        for uid, uname, src in bad_sources[:10]:
            print(f"    -> id={uid} {uname}: '{src}'")
    else:
        print(f"  [OK] All {with_source} sources match known patterns")

    cur.execute("SELECT id, name, source FROM users WHERE role='commentator' AND (source LIKE '%<script%' OR source LIKE '%javascript:%' OR source LIKE '%onclick%')")
    xss_sources = cur.fetchall()
    check(len(xss_sources) == 0, f"No XSS in source fields ({len(xss_sources)} found)")

    import re
    cur.execute("SELECT source FROM users WHERE role='commentator' AND source IS NOT NULL")
    date_pattern = re.compile(r'\((\d{1,2}/\d{1,2})')
    bad_dates = []
    for (source,) in cur.fetchall():
        match = date_pattern.search(source)
        if match:
            month, day = (int(part) for part in match.group(1).split("/"))
            if month < 1 or month > 12 or day < 1 or day > 31:
                bad_dates.append(source)
    check(len(bad_dates) == 0, f"All source dates have valid M/DD format ({len(bad_dates)} invalid)")

    print("\n=== 10. No duplicate predictions ===")
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
    if temp_dir is not None:
        temp_dir.cleanup()

    print(f"\n{'='*50}")
    if errors:
        print(f"FAILED: {len(errors)} error(s)")
        sys.exit(1)

    print("ALL CHECKS PASSED")
    sys.exit(0)


if __name__ == "__main__":
    main()
