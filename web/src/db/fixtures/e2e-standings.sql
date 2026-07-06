-- E2E fixture: minimal actual_team_standings rows for the active season.
-- Lets scoreboard.e2e.ts verify that scoring produces non-zero results in CI.
-- Production data is unaffected (this file is only applied to the local D1
-- inside the CI runner, see npb-predictions-ci.yml).

INSERT OR IGNORE INTO actual_team_standings (season_id, league, rank, team_name, wins, losses, draws, snapshot_date, is_final) VALUES
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'central', 1, '東京ヤクルトスワローズ',     12, 4, 0, strftime('%s', '2026-07-06'), 0),
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'central', 2, '横浜DeNAベイスターズ',       10, 6, 0, strftime('%s', '2026-07-06'), 0),
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'central', 3, '読売ジャイアンツ',           9, 7, 0, strftime('%s', '2026-07-06'), 0),
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'central', 4, '阪神タイガース',             8, 8, 0, strftime('%s', '2026-07-06'), 0),
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'central', 5, '広島東洋カープ',             7, 9, 0, strftime('%s', '2026-07-06'), 0),
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'central', 6, '中日ドラゴンズ',             5, 11, 0, strftime('%s', '2026-07-06'), 0),
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'pacific', 1, '福岡ソフトバンクホークス',   13, 3, 0, strftime('%s', '2026-07-06'), 0),
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'pacific', 2, '北海道日本ハムファイターズ', 10, 6, 0, strftime('%s', '2026-07-06'), 0),
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'pacific', 3, 'オリックス・バファローズ',   9, 7, 0, strftime('%s', '2026-07-06'), 0),
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'pacific', 4, '埼玉西武ライオンズ',         8, 8, 0, strftime('%s', '2026-07-06'), 0),
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'pacific', 5, '千葉ロッテマリーンズ',       6, 10, 0, strftime('%s', '2026-07-06'), 0),
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'pacific', 6, '東北楽天ゴールデンイーグルス', 4, 12, 0, strftime('%s', '2026-07-06'), 0);

-- E2E fixture for public image routes. These rows make
-- /api/newspaper/[teamSlug] and /api/ranking-card/[type] exercise the same
-- real-data path as production instead of returning the intentional 404
-- empty-data state.
INSERT OR IGNORE INTO game_results (
  season_id,
  game_date,
  league,
  home_team,
  away_team,
  home_score,
  away_score,
  status,
  winner,
  stadium,
  snapshot_date
) VALUES (
  (SELECT id FROM seasons WHERE is_active = 1 LIMIT 1),
  '2026-07-05',
  'central',
  '阪神タイガース',
  '読売ジャイアンツ',
  4,
  2,
  'final',
  'home',
  '甲子園',
  strftime('%s', '2026-07-06')
);

INSERT OR IGNORE INTO score_snapshots (
  user_id,
  season_id,
  ranking_score,
  title_score,
  total_score,
  rank,
  snapshot_date
)
SELECT
  users.id,
  (SELECT id FROM seasons WHERE is_active = 1 LIMIT 1),
  12 + users.id,
  users.id % 5,
  12 + users.id + (users.id % 5),
  users.id,
  strftime('%s', '2026-07-06')
FROM users
ORDER BY users.id
LIMIT 6;
