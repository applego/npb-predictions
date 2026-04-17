#!/usr/bin/env python3
"""Recalculate score_snapshots for season_id=2 using actual_team_standings."""

import json
import subprocess
import sys
from collections import defaultdict

SEASON_ID = 2
SCORE_TABLE = {0: 5, 1: 3, 2: 1, 3: -1, 4: -3, 5: -5}

# shortName (ranking_picks) → fullName (actual_team_standings)
SHORT_TO_FULL = {
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

def d1_query(sql: str) -> list[dict]:
    result = subprocess.run(
        ["npx", "wrangler", "d1", "execute", "npb-predictions",
         "--remote", "--json", "--command", sql],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print("Error:", result.stderr, file=sys.stderr)
        sys.exit(1)
    data = json.loads(result.stdout)
    return data[0]["results"]


def main():
    print("=== Step 1: Fetching actual standings ===")
    standings_rows = d1_query(
        f"SELECT league, rank, team_name FROM actual_team_standings WHERE season_id={SEASON_ID}"
    )
    # actual_rank[(league, team_name)] = rank
    actual_rank: dict[tuple[str, str], int] = {}
    for row in standings_rows:
        actual_rank[(row["league"], row["team_name"])] = row["rank"]
    print(f"  Loaded {len(actual_rank)} standings entries")
    for (league, team), rank in sorted(actual_rank.items()):
        print(f"    {league} {rank}位: {team}")

    print("\n=== Step 2: Fetching all ranking_picks for season_id=2 ===")
    picks_rows = d1_query(
        f"""SELECT p.user_id, rp.league, rp.rank as predicted_rank, rp.team_name
            FROM ranking_picks rp
            JOIN predictions p ON rp.prediction_id = p.id
            WHERE p.season_id = {SEASON_ID}"""
    )
    print(f"  Loaded {len(picks_rows)} pick rows")

    # Build per-user picks: user_picks[user_id][(league, team_name)] = predicted_rank
    user_picks: dict[int, dict[tuple[str, str], int]] = defaultdict(dict)
    for row in picks_rows:
        uid = row["user_id"]
        league = row["league"]
        team_raw = row["team_name"]
        # Normalize to full name (actual_team_standings uses full names)
        team = SHORT_TO_FULL.get(team_raw, team_raw)
        predicted = row["predicted_rank"]
        user_picks[uid][(league, team)] = predicted

    print(f"  Unique users with picks: {len(user_picks)}")

    print("\n=== Step 3: Computing scores ===")
    user_scores: dict[int, int] = {}
    for uid, picks in user_picks.items():
        score = 0
        for (league, team), predicted in picks.items():
            actual = actual_rank.get((league, team))
            if actual is None:
                print(f"  WARNING: No actual rank for {league}/{team}, skipping")
                continue
            diff = min(abs(predicted - actual), 5)
            score += SCORE_TABLE[diff]
        user_scores[uid] = score

    print(f"  Computed scores for {len(user_scores)} users")
    scores_list = sorted(user_scores.items(), key=lambda x: -x[1])
    print("  Top 10:")
    for uid, sc in scores_list[:10]:
        print(f"    user_id={uid}: {sc}点")
    print("  Bottom 5:")
    for uid, sc in scores_list[-5:]:
        print(f"    user_id={uid}: {sc}点")

    print("\n=== Step 4: Generating UPDATE SQL ===")
    # Build CASE WHEN statement for batch update
    ranking_cases = " ".join(
        f"WHEN user_id={uid} THEN {sc}" for uid, sc in user_scores.items()
    )
    user_ids_str = ",".join(str(uid) for uid in user_scores)

    update_sql = (
        f"UPDATE score_snapshots SET "
        f"ranking_score = CASE {ranking_cases} ELSE 0 END, "
        f"total_score = CASE {ranking_cases} ELSE 0 END "
        f"WHERE season_id={SEASON_ID} AND user_id IN ({user_ids_str})"
    )

    # Write SQL to file for inspection
    sql_file = "/tmp/npb_recalc.sql"
    with open(sql_file, "w") as f:
        f.write(update_sql)
    print(f"  SQL written to {sql_file} ({len(update_sql)} chars)")

    print("\n=== Step 5: Executing UPDATE on production D1 ===")
    result = subprocess.run(
        ["npx", "wrangler", "d1", "execute", "npb-predictions",
         "--remote", "--json", "--command", update_sql],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print("Error:", result.stderr, file=sys.stderr)
        sys.exit(1)
    data = json.loads(result.stdout)
    meta = data[0].get("meta", {})
    print(f"  Changes: {meta.get('changes', '?')}")
    print(f"  Rows written: {meta.get('rows_written', '?')}")

    print("\n=== Step 6: Verifying ===")
    verify = d1_query(
        f"""SELECT COUNT(*) as cnt,
                   MIN(total_score) as min_score,
                   MAX(total_score) as max_score,
                   AVG(total_score) as avg_score
            FROM score_snapshots WHERE season_id={SEASON_ID}"""
    )
    v = verify[0]
    print(f"  Rows: {v['cnt']}, min={v['min_score']}, max={v['max_score']}, avg={v['avg_score']:.1f}")

    top5 = d1_query(
        f"""SELECT user_id, total_score
            FROM score_snapshots WHERE season_id={SEASON_ID}
            GROUP BY user_id
            HAVING total_score = MAX(total_score)
            ORDER BY total_score DESC LIMIT 5"""
    )
    print("  Top 5 users:")
    for row in top5:
        print(f"    user_id={row['user_id']}: {row['total_score']}点")

    print("\nDone!")


if __name__ == "__main__":
    main()
