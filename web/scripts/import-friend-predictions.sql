-- Import friend predictions from spreadsheet (2023, 2024, 2025)
-- Season IDs: 2023=4, 2024=5, 2025=6
-- User IDs: Oya=1, Ishiro=2, Kuramoto=3, Tsuneshige=4, Kumagae=5
-- Timestamps: 2023-03-30=1680134400, 2024-03-29=1711670400, 2025-03-28=1743120000

INSERT INTO predictions (user_id, season_id, is_locked, locked_at, created_at, updated_at) VALUES
(1, 4, 1, 1680134400, 1680134400, 1680134400),
(2, 4, 1, 1680134400, 1680134400, 1680134400),
(3, 4, 1, 1680134400, 1680134400, 1680134400),
(4, 4, 1, 1680134400, 1680134400, 1680134400),
(5, 4, 1, 1680134400, 1680134400, 1680134400),
(1, 5, 1, 1711670400, 1711670400, 1711670400),
(2, 5, 1, 1711670400, 1711670400, 1711670400),
(3, 5, 1, 1711670400, 1711670400, 1711670400),
(4, 5, 1, 1711670400, 1711670400, 1711670400),
(5, 5, 1, 1711670400, 1711670400, 1711670400),
(1, 6, 1, 1743120000, 1743120000, 1743120000),
(2, 6, 1, 1743120000, 1743120000, 1743120000),
(3, 6, 1, 1743120000, 1743120000, 1743120000),
(4, 6, 1, 1743120000, 1743120000, 1743120000),
(5, 6, 1, 1743120000, 1743120000, 1743120000);

-- =====================
-- RANKING PICKS
-- =====================

INSERT INTO ranking_picks (prediction_id, league, rank, team_name) VALUES
-- ===== 2023 CENTRAL =====
-- Oya: 阪神,広島,巨人,中日,DeNA,ヤクルト
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'central', 1, '阪神'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'central', 2, '広島'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'central', 3, '巨人'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'central', 4, '中日'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'central', 5, 'DeNA'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'central', 6, 'ヤクルト'),
-- Ishiro: DeNA,阪神,ヤクルト,広島,巨人,中日
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'central', 1, 'DeNA'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'central', 2, '阪神'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'central', 3, 'ヤクルト'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'central', 4, '広島'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'central', 5, '巨人'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'central', 6, '中日'),
-- Kuramoto: 阪神,ヤクルト,巨人,DeNA,中日,広島
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'central', 1, '阪神'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'central', 2, 'ヤクルト'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'central', 3, '巨人'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'central', 4, 'DeNA'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'central', 5, '中日'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'central', 6, '広島'),
-- Tsuneshige: DeNA,阪神,中日,ヤクルト,巨人,広島
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'central', 1, 'DeNA'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'central', 2, '阪神'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'central', 3, '中日'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'central', 4, 'ヤクルト'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'central', 5, '巨人'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'central', 6, '広島'),
-- Kumagae: DeNA,ヤクルト,中日,阪神,広島,巨人
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'central', 1, 'DeNA'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'central', 2, 'ヤクルト'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'central', 3, '中日'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'central', 4, '阪神'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'central', 5, '広島'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'central', 6, '巨人'),
-- ===== 2023 PACIFIC =====
-- Oya: 西武,日本ハム,ソフトバンク,オリックス,ロッテ,楽天
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'pacific', 1, '西武'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'pacific', 2, '日本ハム'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'pacific', 3, 'ソフトバンク'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'pacific', 4, 'オリックス'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'pacific', 5, 'ロッテ'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'pacific', 6, '楽天'),
-- Ishiro: ソフトバンク,オリックス,楽天,西武,ロッテ,日本ハム
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'pacific', 1, 'ソフトバンク'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'pacific', 2, 'オリックス'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'pacific', 3, '楽天'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'pacific', 4, '西武'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'pacific', 5, 'ロッテ'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'pacific', 6, '日本ハム'),
-- Kuramoto: ソフトバンク,オリックス,楽天,ロッテ,西武,日本ハム
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'pacific', 1, 'ソフトバンク'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'pacific', 2, 'オリックス'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'pacific', 3, '楽天'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'pacific', 4, 'ロッテ'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'pacific', 5, '西武'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'pacific', 6, '日本ハム'),
-- Tsuneshige: オリックス,ソフトバンク,西武,楽天,ロッテ,日本ハム
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'pacific', 1, 'オリックス'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'pacific', 2, 'ソフトバンク'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'pacific', 3, '西武'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'pacific', 4, '楽天'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'pacific', 5, 'ロッテ'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'pacific', 6, '日本ハム'),
-- Kumagae: オリックス,楽天,ソフトバンク,西武,日本ハム,ロッテ
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'pacific', 1, 'オリックス'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'pacific', 2, '楽天'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'pacific', 3, 'ソフトバンク'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'pacific', 4, '西武'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'pacific', 5, '日本ハム'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'pacific', 6, 'ロッテ'),

-- ===== 2024 CENTRAL =====
-- Oya: 阪神,広島,中日,DeNA,巨人,ヤクルト
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'central', 1, '阪神'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'central', 2, '広島'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'central', 3, '中日'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'central', 4, 'DeNA'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'central', 5, '巨人'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'central', 6, 'ヤクルト'),
-- Ishiro: DeNA,阪神,巨人,広島,中日,ヤクルト
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'central', 1, 'DeNA'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'central', 2, '阪神'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'central', 3, '巨人'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'central', 4, '広島'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'central', 5, '中日'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'central', 6, 'ヤクルト'),
-- Kuramoto: 阪神,巨人,広島,ヤクルト,DeNA,中日
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'central', 1, '阪神'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'central', 2, '巨人'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'central', 3, '広島'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'central', 4, 'ヤクルト'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'central', 5, 'DeNA'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'central', 6, '中日'),
-- Tsuneshige: DeNA,阪神,巨人,広島,中日,ヤクルト
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'central', 1, 'DeNA'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'central', 2, '阪神'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'central', 3, '巨人'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'central', 4, '広島'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'central', 5, '中日'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'central', 6, 'ヤクルト'),
-- Kumagae: 阪神,DeNA,広島,巨人,中日,ヤクルト
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'central', 1, '阪神'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'central', 2, 'DeNA'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'central', 3, '広島'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'central', 4, '巨人'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'central', 5, '中日'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'central', 6, 'ヤクルト'),
-- ===== 2024 PACIFIC =====
-- Oya: 西武,オリックス,日本ハム,ソフトバンク,ロッテ,楽天
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'pacific', 1, '西武'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'pacific', 2, 'オリックス'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'pacific', 3, '日本ハム'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'pacific', 4, 'ソフトバンク'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'pacific', 5, 'ロッテ'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'pacific', 6, '楽天'),
-- Ishiro: ソフトバンク,オリックス,日本ハム,ロッテ,西武,楽天
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'pacific', 1, 'ソフトバンク'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'pacific', 2, 'オリックス'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'pacific', 3, '日本ハム'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'pacific', 4, 'ロッテ'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'pacific', 5, '西武'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'pacific', 6, '楽天'),
-- Kuramoto: オリックス,ソフトバンク,楽天,ロッテ,西武,日本ハム
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'pacific', 1, 'オリックス'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'pacific', 2, 'ソフトバンク'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'pacific', 3, '楽天'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'pacific', 4, 'ロッテ'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'pacific', 5, '西武'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'pacific', 6, '日本ハム'),
-- Tsuneshige: ロッテ,ソフトバンク,オリックス,西武,楽天,日本ハム
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'pacific', 1, 'ロッテ'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'pacific', 2, 'ソフトバンク'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'pacific', 3, 'オリックス'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'pacific', 4, '西武'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'pacific', 5, '楽天'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'pacific', 6, '日本ハム'),
-- Kumagae: ソフトバンク,オリックス,ロッテ,西武,日本ハム,楽天
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'pacific', 1, 'ソフトバンク'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'pacific', 2, 'オリックス'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'pacific', 3, 'ロッテ'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'pacific', 4, '西武'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'pacific', 5, '日本ハム'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'pacific', 6, '楽天'),

-- ===== 2025 CENTRAL =====
-- Oya: 阪神,中日,巨人,DeNA,広島,ヤクルト
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'central', 1, '阪神'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'central', 2, '中日'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'central', 3, '巨人'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'central', 4, 'DeNA'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'central', 5, '広島'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'central', 6, 'ヤクルト'),
-- Ishiro: DeNA,巨人,阪神,広島,中日,ヤクルト
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'central', 1, 'DeNA'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'central', 2, '巨人'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'central', 3, '阪神'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'central', 4, '広島'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'central', 5, '中日'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'central', 6, 'ヤクルト'),
-- Kuramoto: 阪神,巨人,DeNA,中日,広島,ヤクルト
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'central', 1, '阪神'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'central', 2, '巨人'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'central', 3, 'DeNA'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'central', 4, '中日'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'central', 5, '広島'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'central', 6, 'ヤクルト'),
-- Tsuneshige: DeNA,阪神,巨人,広島,中日,ヤクルト
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'central', 1, 'DeNA'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'central', 2, '阪神'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'central', 3, '巨人'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'central', 4, '広島'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'central', 5, '中日'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'central', 6, 'ヤクルト'),
-- Kumagae: DeNA,巨人,阪神,広島,中日,ヤクルト
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'central', 1, 'DeNA'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'central', 2, '巨人'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'central', 3, '阪神'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'central', 4, '広島'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'central', 5, '中日'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'central', 6, 'ヤクルト'),
-- ===== 2025 PACIFIC =====
-- Oya: 西武,日本ハム,ソフトバンク,ロッテ,オリックス,楽天
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'pacific', 1, '西武'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'pacific', 2, '日本ハム'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'pacific', 3, 'ソフトバンク'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'pacific', 4, 'ロッテ'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'pacific', 5, 'オリックス'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'pacific', 6, '楽天'),
-- Ishiro: 日本ハム,ソフトバンク,ロッテ,オリックス,西武,楽天
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'pacific', 1, '日本ハム'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'pacific', 2, 'ソフトバンク'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'pacific', 3, 'ロッテ'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'pacific', 4, 'オリックス'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'pacific', 5, '西武'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'pacific', 6, '楽天'),
-- Kuramoto: ソフトバンク,日本ハム,楽天,ロッテ,オリックス,西武
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'pacific', 1, 'ソフトバンク'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'pacific', 2, '日本ハム'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'pacific', 3, '楽天'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'pacific', 4, 'ロッテ'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'pacific', 5, 'オリックス'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'pacific', 6, '西武'),
-- Tsuneshige: ソフトバンク,日本ハム,ロッテ,西武,楽天,オリックス
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'pacific', 1, 'ソフトバンク'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'pacific', 2, '日本ハム'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'pacific', 3, 'ロッテ'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'pacific', 4, '西武'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'pacific', 5, '楽天'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'pacific', 6, 'オリックス'),
-- Kumagae: 日本ハム,ソフトバンク,ロッテ,オリックス,西武,楽天
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'pacific', 1, '日本ハム'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'pacific', 2, 'ソフトバンク'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'pacific', 3, 'ロッテ'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'pacific', 4, 'オリックス'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'pacific', 5, '西武'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'pacific', 6, '楽天');

-- =====================
-- TITLE PICKS
-- =====================

INSERT INTO title_picks (prediction_id, league, category, player_name, team_name) VALUES
-- ===== 2023 CENTRAL TITLES =====
-- Oya
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'central', 'batting_avg', '森下', NULL),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'central', 'rbi', '高橋周', NULL),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'central', 'home_runs', 'ブリンソン', NULL),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'central', 'wins', '西純', NULL),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'central', 'era', '伊藤', NULL),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'central', 'saves', '栗林', NULL),
-- Ishiro
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'central', 'batting_avg', '佐野', NULL),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'central', 'rbi', '牧', NULL),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'central', 'home_runs', '村上', NULL),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'central', 'wins', '今永', NULL),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'central', 'era', '青柳', NULL),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'central', 'saves', '山崎', NULL),
-- Kuramoto
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'central', 'batting_avg', '村上', NULL),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'central', 'rbi', '岡本', NULL),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'central', 'home_runs', '岡本', NULL),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'central', 'wins', '青柳', NULL),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'central', 'era', '戸郷', NULL),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'central', 'saves', '湯浅', NULL),
-- Tsuneshige
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'central', 'batting_avg', '佐野', NULL),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'central', 'rbi', '村上', NULL),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'central', 'home_runs', '村上', NULL),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'central', 'wins', '高橋宏', NULL),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'central', 'era', '高橋宏', NULL),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'central', 'saves', '山崎', NULL),
-- Kumagae
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'central', 'batting_avg', '岡林', NULL),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'central', 'rbi', '牧', NULL),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'central', 'home_runs', '岡本', NULL),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'central', 'wins', '今永', NULL),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'central', 'era', '今永', NULL),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'central', 'saves', '山崎', NULL),
-- ===== 2023 PACIFIC TITLES =====
-- Oya
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'pacific', 'batting_avg', '野口', NULL),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'pacific', 'rbi', '松本', NULL),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'pacific', 'home_runs', '清宮', NULL),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'pacific', 'wins', '今井', NULL),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'pacific', 'era', '佐々木', NULL),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=4), 'pacific', 'saves', '増田', NULL),
-- Ishiro
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'pacific', 'batting_avg', '近藤', NULL),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'pacific', 'rbi', '柳田', NULL),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'pacific', 'home_runs', '山川', NULL),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'pacific', 'wins', '山本', NULL),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'pacific', 'era', '山本', NULL),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=4), 'pacific', 'saves', 'オスナ', NULL),
-- Kuramoto
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'pacific', 'batting_avg', '松本', NULL),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'pacific', 'rbi', '柳田', NULL),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'pacific', 'home_runs', '柳田', NULL),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'pacific', 'wins', '佐々木', NULL),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'pacific', 'era', '山本', NULL),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=4), 'pacific', 'saves', '松井裕', NULL),
-- Tsuneshige
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'pacific', 'batting_avg', '森', NULL),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'pacific', 'rbi', '山川', NULL),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'pacific', 'home_runs', '山川', NULL),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'pacific', 'wins', '山本', NULL),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'pacific', 'era', '山本', NULL),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=4), 'pacific', 'saves', '松井裕', NULL),
-- Kumagae
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'pacific', 'batting_avg', '松本', NULL),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'pacific', 'rbi', '柳田', NULL),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'pacific', 'home_runs', '山川', NULL),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'pacific', 'wins', '山本', NULL),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'pacific', 'era', '山本', NULL),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=4), 'pacific', 'saves', 'オスナ', NULL),

-- ===== 2024 CENTRAL TITLES =====
-- Oya
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'central', 'batting_avg', '小園', '広'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'central', 'rbi', '佐藤', '阪'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'central', 'home_runs', '中田', '中'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'central', 'wins', '伊藤', '阪'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'central', 'era', '床田', '広'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'central', 'saves', 'ゲラ', '阪'),
-- Ishiro
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'central', 'batting_avg', '渡会', 'D'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'central', 'rbi', '牧', 'D'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'central', 'home_runs', '牧', 'D'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'central', 'wins', '東', 'D'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'central', 'era', '東', 'D'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'central', 'saves', 'マルティネス', '中'),
-- Kuramoto
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'central', 'batting_avg', '近本', '阪'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'central', 'rbi', '中野', '阪'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'central', 'home_runs', '牧', 'D'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'central', 'wins', '戸郷', '巨'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'central', 'era', '村上', '阪'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'central', 'saves', '岩崎', '阪'),
-- Tsuneshige
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'central', 'batting_avg', '小園', '広'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'central', 'rbi', '牧', 'D'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'central', 'home_runs', '村上', 'ヤ'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'central', 'wins', '大貫', 'D'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'central', 'era', '高橋', '中'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'central', 'saves', 'マルティネス', '中'),
-- Kumagae
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'central', 'batting_avg', '佐野', 'D'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'central', 'rbi', '岡本', '巨'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'central', 'home_runs', 'オースティン', 'D'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'central', 'wins', '東', 'D'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'central', 'era', '東', 'D'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'central', 'saves', 'マルティネス', '中'),
-- ===== 2024 PACIFIC TITLES =====
-- Oya
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'pacific', 'batting_avg', '松本', '日'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'pacific', 'rbi', 'アギラー', '西'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'pacific', 'home_runs', 'ソト', 'ロ'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'pacific', 'wins', '隅田', '西'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'pacific', 'era', '今井', '西'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=5), 'pacific', 'saves', '平井', '西'),
-- Ishiro
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'pacific', 'batting_avg', '近藤', 'ソ'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'pacific', 'rbi', '柳田', 'ソ'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'pacific', 'home_runs', '浅村', '楽'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'pacific', 'wins', '伊藤', '日'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'pacific', 'era', '平良', '西'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=5), 'pacific', 'saves', '則本', '楽'),
-- Kuramoto
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'pacific', 'batting_avg', '近藤', 'ソ'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'pacific', 'rbi', '近藤', 'ソ'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'pacific', 'home_runs', '万波', '日'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'pacific', 'wins', '伊藤', '日'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'pacific', 'era', '佐々木', 'ロ'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=5), 'pacific', 'saves', 'オスナ', 'ソ'),
-- Tsuneshige
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'pacific', 'batting_avg', '近藤', 'ソ'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'pacific', 'rbi', '山川', 'ソ'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'pacific', 'home_runs', '山川', 'ソ'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'pacific', 'wins', '佐々木', 'ロ'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'pacific', 'era', '佐々木', 'ロ'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=5), 'pacific', 'saves', 'オスナ', 'ソ'),
-- Kumagae
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'pacific', 'batting_avg', 'アギラー', '西'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'pacific', 'rbi', '頓宮', 'オ'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'pacific', 'home_runs', '山川', 'ソ'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'pacific', 'wins', '有原', 'ソ'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'pacific', 'era', '宮城', 'オ'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=5), 'pacific', 'saves', '則本', '楽'),

-- ===== 2025 CENTRAL TITLES =====
-- Oya
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'central', 'batting_avg', '長岡', 'ヤ'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'central', 'rbi', '森下', '阪'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'central', 'home_runs', '佐藤', '阪'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'central', 'wins', '村上', '阪'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'central', 'era', 'マラー', '中'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'central', 'saves', '栗林', '広'),
-- Ishiro
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'central', 'batting_avg', '牧', 'De'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'central', 'rbi', '岡本', '巨'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'central', 'home_runs', '村上', 'ヤ'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'central', 'wins', '東', 'De'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'central', 'era', '戸郷', '巨'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'central', 'saves', 'マルティネス', '巨'),
-- Kuramoto
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'central', 'batting_avg', '近本', '阪'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'central', 'rbi', '大山', '阪'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'central', 'home_runs', '山田', 'ヤ'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'central', 'wins', 'バウアー', 'De'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'central', 'era', '高橋', '中'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'central', 'saves', 'マルティネス', '巨'),
-- Tsuneshige
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'central', 'batting_avg', '梶原', 'De'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'central', 'rbi', 'オースティン', 'De'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'central', 'home_runs', '岡本', '巨'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'central', 'wins', 'バウアー', 'De'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'central', 'era', '才木', '阪'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'central', 'saves', 'マルティネス', '巨'),
-- Kumagae
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'central', 'batting_avg', '佐野', 'De'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'central', 'rbi', '牧', 'De'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'central', 'home_runs', '村上', 'ヤ'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'central', 'wins', 'バウアー', 'De'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'central', 'era', '高橋', '中'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'central', 'saves', 'マルティネス', '巨'),
-- ===== 2025 PACIFIC TITLES =====
-- Oya
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'pacific', 'batting_avg', '西川', '西'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'pacific', 'rbi', 'セデーニョ', '西'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'pacific', 'home_runs', '清宮', '日'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'pacific', 'wins', '今井', '西'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'pacific', 'era', '今井', '西'),
((SELECT id FROM predictions WHERE user_id=1 AND season_id=6), 'pacific', 'saves', '平良', '西'),
-- Ishiro
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'pacific', 'batting_avg', '近藤', 'ソ'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'pacific', 'rbi', '万波', '日'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'pacific', 'home_runs', 'レイエス', '日'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'pacific', 'wins', '伊藤', '日'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'pacific', 'era', 'モイネロ', 'ソ'),
((SELECT id FROM predictions WHERE user_id=2 AND season_id=6), 'pacific', 'saves', '平良', '西'),
-- Kuramoto
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'pacific', 'batting_avg', '西川', 'オ'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'pacific', 'rbi', '柳田', 'ソ'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'pacific', 'home_runs', '浅村', '楽'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'pacific', 'wins', '早川', '楽'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'pacific', 'era', '今井', '西'),
((SELECT id FROM predictions WHERE user_id=3 AND season_id=6), 'pacific', 'saves', '平良', '西'),
-- Tsuneshige
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'pacific', 'batting_avg', '近藤', 'ソ'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'pacific', 'rbi', '山川', 'ソ'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'pacific', 'home_runs', '万波', '日'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'pacific', 'wins', '伊藤', '日'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'pacific', 'era', '今井', '西'),
((SELECT id FROM predictions WHERE user_id=4 AND season_id=6), 'pacific', 'saves', '平良', '西'),
-- Kumagae
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'pacific', 'batting_avg', '近藤', 'ソ'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'pacific', 'rbi', '山川', 'ソ'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'pacific', 'home_runs', '山川', 'ソ'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'pacific', 'wins', '伊藤', '日'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'pacific', 'era', '宮城', 'オ'),
((SELECT id FROM predictions WHERE user_id=5 AND season_id=6), 'pacific', 'saves', 'オスナ', 'ソ');
