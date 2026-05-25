-- E2E fixture: minimal actual_team_standings rows for the active season.
-- Lets scoreboard.e2e.ts verify that scoring produces non-zero results in CI.
-- Production data is unaffected (this file is only applied to the local D1
-- inside the CI runner, see npb-predictions-ci.yml).

INSERT INTO actual_team_standings (season_id, league, rank, team_name, wins, losses, draws, snapshot_date, is_final) VALUES
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'central', 1, '東京ヤクルトスワローズ',     12, 4, 0, unixepoch(), 0),
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'central', 2, '横浜DeNAベイスターズ',       10, 6, 0, unixepoch(), 0),
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'central', 3, '読売ジャイアンツ',           9, 7, 0, unixepoch(), 0),
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'central', 4, '阪神タイガース',             8, 8, 0, unixepoch(), 0),
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'central', 5, '広島東洋カープ',             7, 9, 0, unixepoch(), 0),
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'central', 6, '中日ドラゴンズ',             5, 11, 0, unixepoch(), 0),
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'pacific', 1, '福岡ソフトバンクホークス',   13, 3, 0, unixepoch(), 0),
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'pacific', 2, '北海道日本ハムファイターズ', 10, 6, 0, unixepoch(), 0),
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'pacific', 3, 'オリックス・バファローズ',   9, 7, 0, unixepoch(), 0),
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'pacific', 4, '埼玉西武ライオンズ',         8, 8, 0, unixepoch(), 0),
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'pacific', 5, '千葉ロッテマリーンズ',       6, 10, 0, unixepoch(), 0),
  ((SELECT id FROM seasons WHERE is_active = 1 LIMIT 1), 'pacific', 6, '東北楽天ゴールデンイーグルス', 4, 12, 0, unixepoch(), 0);
