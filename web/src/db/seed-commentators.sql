-- Season
INSERT OR IGNORE INTO seasons (year, label, is_active) VALUES (2026, '2026シーズン', 1);

-- Core 5 users
INSERT OR IGNORE INTO users (name, slug, role) VALUES ('大矢','oya','friend'),('Ishiro','ishiro','friend'),('Kuramoto','kuramoto','friend'),('常重','tsuneshige','friend'),('熊谷','kumagae','friend');
UPDATE users SET name='大矢', role='friend' WHERE slug='oya';
UPDATE users SET name='常重', role='friend' WHERE slug='tsuneshige';
UPDATE users SET name='熊谷', role='friend' WHERE slug='kumagae';

-- Core 5 private battle group
INSERT OR IGNORE INTO battle_groups (name, slug, created_by, invite_code)
SELECT 'コア5人リーグ', 'core-five', u.id, 'CORE5X'
FROM users u
WHERE u.slug = 'tsuneshige';
UPDATE battle_groups
SET
  name = 'コア5人リーグ',
  created_by = (SELECT id FROM users WHERE slug = 'tsuneshige'),
  invite_code = 'CORE5X'
WHERE slug = 'core-five'
  AND EXISTS (SELECT 1 FROM users WHERE slug = 'tsuneshige');
INSERT OR IGNORE INTO battle_group_members (group_id, user_id)
SELECT g.id, u.id
FROM battle_groups g
JOIN users u ON u.slug IN ('oya', 'ishiro', 'kuramoto', 'tsuneshige', 'kumagae')
WHERE g.slug = 'core-five';

-- 24 commentators
INSERT OR IGNORE INTO users (name, slug, role) VALUES ('権藤 博','kondo-hiroshi','commentator'),('一枝 修平','ichieda-shuhei','commentator'),('山田 久志','yamada-hisashi','commentator'),('真弓 明信','mayumi-akinobu','commentator'),('梨田 昌孝','nashida-masataka','commentator'),('大石大二郎','oishi-daijiro','commentator'),('中西 清起','nakanishi-kiyoki','commentator'),('緒方 孝市','ogata-koichi','commentator'),('桧山進次郎','hiyama-shinjiro','commentator'),('浜名 千広','hamana-chihiro','commentator'),('今岡 真訴','imaoka-masato','commentator'),('鳥谷 敬','toritani-takashi','commentator'),('平石 洋介','hiraishi-yosuke','commentator'),('里崎 智也','satozaki-tomoya','commentator'),('上原 浩治','uehara-koji','commentator'),('谷繁 元信','tanishige-motonobu','commentator'),('宮本 慎也','miyamoto-shinya','commentator'),('佐々木主浩','sasaki-kazuhiro','commentator'),('緒方 耕一','ogata-koichi-b','commentator'),('渡辺 久信','watanabe-hisanobu','commentator'),('田村 藤夫','tamura-fujio','commentator'),('篠塚 和典','shinozuka-kazunori','commentator'),('西本 聖','nishimoto-hijiri','commentator'),('岩田 稔','iwata-minoru','commentator');
UPDATE users SET role='commentator' WHERE slug IN ('kondo-hiroshi','ichieda-shuhei','yamada-hisashi','mayumi-akinobu','nashida-masataka','oishi-daijiro','nakanishi-kiyoki','ogata-koichi','hiyama-shinjiro','hamana-chihiro','imaoka-masato','toritani-takashi','hiraishi-yosuke','satozaki-tomoya','uehara-koji','tanishige-motonobu','miyamoto-shinya','sasaki-kazuhiro','ogata-koichi-b','watanabe-hisanobu','tamura-fujio','shinozuka-kazunori','nishimoto-hijiri','iwata-minoru');

-- Predictions for all 29 users
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='oya' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='ishiro' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='kuramoto' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='tsuneshige' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='kumagae' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='kondo-hiroshi' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='ichieda-shuhei' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='yamada-hisashi' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='mayumi-akinobu' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='nashida-masataka' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='oishi-daijiro' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='nakanishi-kiyoki' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='ogata-koichi' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='hiyama-shinjiro' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='hamana-chihiro' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='imaoka-masato' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='toritani-takashi' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='hiraishi-yosuke' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='satozaki-tomoya' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='uehara-koji' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='tanishige-motonobu' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='miyamoto-shinya' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='sasaki-kazuhiro' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='ogata-koichi-b' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='watanabe-hisanobu' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='tamura-fujio' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='shinozuka-kazunori' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='nishimoto-hijiri' AND s.year=2026;
INSERT OR IGNORE INTO predictions (user_id, season_id, is_locked) SELECT u.id, s.id, 1 FROM users u, seasons s WHERE u.slug='iwata-minoru' AND s.year=2026;

-- Ranking picks: Core 5 (both leagues)
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'central', 1, '広島';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'central', 2, '中日';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'central', 3, '巨人';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'central', 4, '阪神';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'central', 5, 'DeNA';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'central', 6, 'ヤクルト';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'pacific', 1, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'pacific', 2, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'pacific', 3, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'pacific', 4, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'pacific', 5, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'pacific', 6, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'central', 1, 'DeNA';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'central', 2, '中日';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'central', 3, '阪神';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'central', 4, '巨人';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'central', 5, '広島';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'central', 6, 'ヤクルト';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'pacific', 1, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'pacific', 2, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'pacific', 3, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'pacific', 4, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'pacific', 5, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'pacific', 6, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'central', 1, '阪神';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'central', 2, 'DeNA';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'central', 3, '中日';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'central', 4, '巨人';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'central', 5, '広島';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'central', 6, 'ヤクルト';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'pacific', 1, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'pacific', 2, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'pacific', 4, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'pacific', 5, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'pacific', 6, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'central', 1, 'DeNA';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'central', 2, '阪神';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'central', 3, '中日';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'central', 4, '広島';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'central', 5, '巨人';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'central', 6, 'ヤクルト';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'pacific', 1, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'pacific', 2, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'pacific', 3, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'pacific', 4, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'pacific', 5, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'central', 1, 'DeNA';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'central', 2, '阪神';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'central', 3, '中日';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'central', 4, '広島';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'central', 5, 'ヤクルト';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'central', 6, '巨人';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'pacific', 1, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'pacific', 2, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'pacific', 3, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'pacific', 4, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'pacific', 5, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'pacific', 6, '楽天';

-- Title picks: Core 5
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'central', 'batting_avg', '中村 貴浩', '広島';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'central', 'rbi', '佐々木 麟太郎', '広島';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'central', 'home_runs', 'サノー', '中日';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'central', 'wins', '髙橋 遥人', '阪神';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'central', 'era', '髙橋 遥人', '阪神';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'central', 'saves', 'フランスア', '中日';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'pacific', 'batting_avg', '黒川 史陽', '楽天';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'pacific', 'rbi', '渡部 健人', '西武';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'pacific', 'home_runs', '清宮 幸太郎', '日本ハム';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'pacific', 'wins', '前田 悠伍', '楽天';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'pacific', 'era', '九里 亜蓮', 'オリックス';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oya' AND s.year=2026), 'pacific', 'saves', 'マチャド', 'オリックス';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'central', 'batting_avg', '岡林 勇希', '中日';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'central', 'rbi', '牧 秀悟', 'DeNA';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'central', 'home_runs', '牧 秀悟', 'DeNA';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'central', 'wins', '東 克樹', 'DeNA';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'central', 'era', '東 克樹', 'DeNA';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'central', 'saves', 'マルティネス', '中日';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'pacific', 'batting_avg', '周東 佑京', 'ソフトバンク';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'pacific', 'rbi', '万波 中正', '日本ハム';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'pacific', 'home_runs', '万波 中正', '日本ハム';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'pacific', 'wins', '有原 航平', '日本ハム';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'pacific', 'era', '槙原 寛己', 'ロッテ';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ishiro' AND s.year=2026), 'pacific', 'saves', '松井 裕樹', '楽天';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'central', 'batting_avg', '佐野 恵太', 'DeNA';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'central', 'rbi', '牧 秀悟', 'DeNA';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'central', 'home_runs', '佐藤 輝明', '阪神';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'central', 'wins', '村上 頌樹', '阪神';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'central', 'era', '髙橋 宏斗', '中日';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'central', 'saves', '岩崎 優', '阪神';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'pacific', 'batting_avg', '近藤 健介', 'ソフトバンク';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'pacific', 'rbi', '山川 穂高', 'ソフトバンク';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'pacific', 'home_runs', '万波 中正', '日本ハム';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'pacific', 'wins', '有原 航平', '日本ハム';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'pacific', 'era', '東浜 巨', 'ソフトバンク';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kuramoto' AND s.year=2026), 'pacific', 'saves', 'オスナ', 'ソフトバンク';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'central', 'batting_avg', '細川 成也', '中日';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'central', 'rbi', '佐藤 輝明', '阪神';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'central', 'home_runs', '細川 成也', '中日';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'central', 'wins', '東 克樹', 'DeNA';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'central', 'era', '才木 浩人', '阪神';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'central', 'saves', '山崎 康晃', 'DeNA';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'pacific', 'batting_avg', '柳町 達', 'ソフトバンク';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'pacific', 'rbi', 'レイエス', '日本ハム';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'pacific', 'home_runs', 'レイエス', '日本ハム';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'pacific', 'wins', '伊藤 大海', '日本ハム';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'pacific', 'era', '宮城 大弥', 'オリックス';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tsuneshige' AND s.year=2026), 'pacific', 'saves', '杉山 一樹', 'ソフトバンク';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'central', 'batting_avg', '泉口 友汰', '巨人';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'central', 'rbi', '佐藤 輝明', '阪神';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'central', 'home_runs', '筒香 嘉智', 'DeNA';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'central', 'wins', '村上 頌樹', '阪神';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'central', 'era', 'デュブランティエ', 'DeNA';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'central', 'saves', '山崎 康晃', 'DeNA';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'pacific', 'batting_avg', '西川 龍馬', 'オリックス';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'pacific', 'rbi', 'レイエス', '日本ハム';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'pacific', 'home_runs', 'ブランドン', '楽天';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'pacific', 'wins', '達 孝太', '日本ハム';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'pacific', 'era', '平良 海馬', '西武';
INSERT OR IGNORE INTO title_picks (prediction_id, league, category, player_name, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kumagae' AND s.year=2026), 'pacific', 'saves', '杉山 一樹', 'ソフトバンク';

-- Ranking picks: 24 commentators (Pacific only)
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kondo-hiroshi' AND s.year=2026), 'pacific', 1, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kondo-hiroshi' AND s.year=2026), 'pacific', 2, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kondo-hiroshi' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kondo-hiroshi' AND s.year=2026), 'pacific', 4, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kondo-hiroshi' AND s.year=2026), 'pacific', 5, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='kondo-hiroshi' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ichieda-shuhei' AND s.year=2026), 'pacific', 1, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ichieda-shuhei' AND s.year=2026), 'pacific', 2, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ichieda-shuhei' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ichieda-shuhei' AND s.year=2026), 'pacific', 4, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ichieda-shuhei' AND s.year=2026), 'pacific', 5, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ichieda-shuhei' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='yamada-hisashi' AND s.year=2026), 'pacific', 1, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='yamada-hisashi' AND s.year=2026), 'pacific', 2, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='yamada-hisashi' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='yamada-hisashi' AND s.year=2026), 'pacific', 4, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='yamada-hisashi' AND s.year=2026), 'pacific', 5, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='yamada-hisashi' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='mayumi-akinobu' AND s.year=2026), 'pacific', 1, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='mayumi-akinobu' AND s.year=2026), 'pacific', 2, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='mayumi-akinobu' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='mayumi-akinobu' AND s.year=2026), 'pacific', 4, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='mayumi-akinobu' AND s.year=2026), 'pacific', 5, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='mayumi-akinobu' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='nashida-masataka' AND s.year=2026), 'pacific', 1, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='nashida-masataka' AND s.year=2026), 'pacific', 2, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='nashida-masataka' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='nashida-masataka' AND s.year=2026), 'pacific', 4, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='nashida-masataka' AND s.year=2026), 'pacific', 5, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='nashida-masataka' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oishi-daijiro' AND s.year=2026), 'pacific', 1, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oishi-daijiro' AND s.year=2026), 'pacific', 2, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oishi-daijiro' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oishi-daijiro' AND s.year=2026), 'pacific', 4, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oishi-daijiro' AND s.year=2026), 'pacific', 5, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='oishi-daijiro' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='nakanishi-kiyoki' AND s.year=2026), 'pacific', 1, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='nakanishi-kiyoki' AND s.year=2026), 'pacific', 2, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='nakanishi-kiyoki' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='nakanishi-kiyoki' AND s.year=2026), 'pacific', 4, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='nakanishi-kiyoki' AND s.year=2026), 'pacific', 5, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='nakanishi-kiyoki' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ogata-koichi' AND s.year=2026), 'pacific', 1, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ogata-koichi' AND s.year=2026), 'pacific', 2, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ogata-koichi' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ogata-koichi' AND s.year=2026), 'pacific', 4, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ogata-koichi' AND s.year=2026), 'pacific', 5, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ogata-koichi' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='hiyama-shinjiro' AND s.year=2026), 'pacific', 1, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='hiyama-shinjiro' AND s.year=2026), 'pacific', 2, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='hiyama-shinjiro' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='hiyama-shinjiro' AND s.year=2026), 'pacific', 4, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='hiyama-shinjiro' AND s.year=2026), 'pacific', 5, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='hiyama-shinjiro' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='hamana-chihiro' AND s.year=2026), 'pacific', 1, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='hamana-chihiro' AND s.year=2026), 'pacific', 2, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='hamana-chihiro' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='hamana-chihiro' AND s.year=2026), 'pacific', 4, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='hamana-chihiro' AND s.year=2026), 'pacific', 5, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='hamana-chihiro' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='imaoka-masato' AND s.year=2026), 'pacific', 1, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='imaoka-masato' AND s.year=2026), 'pacific', 2, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='imaoka-masato' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='imaoka-masato' AND s.year=2026), 'pacific', 4, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='imaoka-masato' AND s.year=2026), 'pacific', 5, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='imaoka-masato' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='toritani-takashi' AND s.year=2026), 'pacific', 1, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='toritani-takashi' AND s.year=2026), 'pacific', 2, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='toritani-takashi' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='toritani-takashi' AND s.year=2026), 'pacific', 4, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='toritani-takashi' AND s.year=2026), 'pacific', 5, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='toritani-takashi' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='hiraishi-yosuke' AND s.year=2026), 'pacific', 1, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='hiraishi-yosuke' AND s.year=2026), 'pacific', 2, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='hiraishi-yosuke' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='hiraishi-yosuke' AND s.year=2026), 'pacific', 4, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='hiraishi-yosuke' AND s.year=2026), 'pacific', 5, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='hiraishi-yosuke' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='satozaki-tomoya' AND s.year=2026), 'pacific', 1, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='satozaki-tomoya' AND s.year=2026), 'pacific', 2, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='satozaki-tomoya' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='satozaki-tomoya' AND s.year=2026), 'pacific', 4, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='satozaki-tomoya' AND s.year=2026), 'pacific', 5, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='satozaki-tomoya' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='uehara-koji' AND s.year=2026), 'pacific', 1, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='uehara-koji' AND s.year=2026), 'pacific', 2, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='uehara-koji' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='uehara-koji' AND s.year=2026), 'pacific', 4, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='uehara-koji' AND s.year=2026), 'pacific', 5, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='uehara-koji' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tanishige-motonobu' AND s.year=2026), 'pacific', 1, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tanishige-motonobu' AND s.year=2026), 'pacific', 2, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tanishige-motonobu' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tanishige-motonobu' AND s.year=2026), 'pacific', 4, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tanishige-motonobu' AND s.year=2026), 'pacific', 5, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tanishige-motonobu' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='miyamoto-shinya' AND s.year=2026), 'pacific', 1, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='miyamoto-shinya' AND s.year=2026), 'pacific', 2, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='miyamoto-shinya' AND s.year=2026), 'pacific', 3, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='miyamoto-shinya' AND s.year=2026), 'pacific', 4, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='miyamoto-shinya' AND s.year=2026), 'pacific', 5, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='miyamoto-shinya' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='sasaki-kazuhiro' AND s.year=2026), 'pacific', 1, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='sasaki-kazuhiro' AND s.year=2026), 'pacific', 2, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='sasaki-kazuhiro' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='sasaki-kazuhiro' AND s.year=2026), 'pacific', 4, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='sasaki-kazuhiro' AND s.year=2026), 'pacific', 5, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='sasaki-kazuhiro' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ogata-koichi-b' AND s.year=2026), 'pacific', 1, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ogata-koichi-b' AND s.year=2026), 'pacific', 2, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ogata-koichi-b' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ogata-koichi-b' AND s.year=2026), 'pacific', 4, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ogata-koichi-b' AND s.year=2026), 'pacific', 5, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='ogata-koichi-b' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='watanabe-hisanobu' AND s.year=2026), 'pacific', 1, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='watanabe-hisanobu' AND s.year=2026), 'pacific', 2, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='watanabe-hisanobu' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='watanabe-hisanobu' AND s.year=2026), 'pacific', 4, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='watanabe-hisanobu' AND s.year=2026), 'pacific', 5, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='watanabe-hisanobu' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tamura-fujio' AND s.year=2026), 'pacific', 1, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tamura-fujio' AND s.year=2026), 'pacific', 2, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tamura-fujio' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tamura-fujio' AND s.year=2026), 'pacific', 4, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tamura-fujio' AND s.year=2026), 'pacific', 5, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='tamura-fujio' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='shinozuka-kazunori' AND s.year=2026), 'pacific', 1, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='shinozuka-kazunori' AND s.year=2026), 'pacific', 2, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='shinozuka-kazunori' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='shinozuka-kazunori' AND s.year=2026), 'pacific', 4, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='shinozuka-kazunori' AND s.year=2026), 'pacific', 5, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='shinozuka-kazunori' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='nishimoto-hijiri' AND s.year=2026), 'pacific', 1, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='nishimoto-hijiri' AND s.year=2026), 'pacific', 2, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='nishimoto-hijiri' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='nishimoto-hijiri' AND s.year=2026), 'pacific', 4, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='nishimoto-hijiri' AND s.year=2026), 'pacific', 5, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='nishimoto-hijiri' AND s.year=2026), 'pacific', 6, '楽天';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='iwata-minoru' AND s.year=2026), 'pacific', 1, 'ソフトバンク';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='iwata-minoru' AND s.year=2026), 'pacific', 2, '日本ハム';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='iwata-minoru' AND s.year=2026), 'pacific', 3, 'オリックス';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='iwata-minoru' AND s.year=2026), 'pacific', 4, '西武';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='iwata-minoru' AND s.year=2026), 'pacific', 5, 'ロッテ';
INSERT OR IGNORE INTO ranking_picks (prediction_id, league, rank, team_name) SELECT (SELECT p.id FROM predictions p JOIN users u ON p.user_id=u.id JOIN seasons s ON p.season_id=s.id WHERE u.slug='iwata-minoru' AND s.year=2026), 'pacific', 6, '楽天';

-- Keep this seed self-contained: CI applies migrations before this file, so
-- the normalization migration cannot clean up rows inserted here.
UPDATE ranking_picks
SET team_name = CASE team_name
  WHEN '巨人' THEN '読売ジャイアンツ'
  WHEN '阪神' THEN '阪神タイガース'
  WHEN 'DeNA' THEN '横浜DeNAベイスターズ'
  WHEN '広島' THEN '広島東洋カープ'
  WHEN '中日' THEN '中日ドラゴンズ'
  WHEN 'ヤクルト' THEN '東京ヤクルトスワローズ'
  WHEN 'オリックス' THEN 'オリックス・バファローズ'
  WHEN 'ソフトバンク' THEN '福岡ソフトバンクホークス'
  WHEN 'ロッテ' THEN '千葉ロッテマリーンズ'
  WHEN '楽天' THEN '東北楽天ゴールデンイーグルス'
  WHEN '西武' THEN '埼玉西武ライオンズ'
  WHEN '日本ハム' THEN '北海道日本ハムファイターズ'
  ELSE team_name
END
WHERE team_name IN (
  '巨人',
  '阪神',
  'DeNA',
  '広島',
  '中日',
  'ヤクルト',
  'オリックス',
  'ソフトバンク',
  'ロッテ',
  '楽天',
  '西武',
  '日本ハム'
);

UPDATE title_picks
SET team_name = CASE team_name
  WHEN '巨人' THEN '読売ジャイアンツ'
  WHEN '阪神' THEN '阪神タイガース'
  WHEN 'DeNA' THEN '横浜DeNAベイスターズ'
  WHEN '広島' THEN '広島東洋カープ'
  WHEN '中日' THEN '中日ドラゴンズ'
  WHEN 'ヤクルト' THEN '東京ヤクルトスワローズ'
  WHEN 'オリックス' THEN 'オリックス・バファローズ'
  WHEN 'ソフトバンク' THEN '福岡ソフトバンクホークス'
  WHEN 'ロッテ' THEN '千葉ロッテマリーンズ'
  WHEN '楽天' THEN '東北楽天ゴールデンイーグルス'
  WHEN '西武' THEN '埼玉西武ライオンズ'
  WHEN '日本ハム' THEN '北海道日本ハムファイターズ'
  ELSE team_name
END
WHERE team_name IN (
  '巨人',
  '阪神',
  'DeNA',
  '広島',
  '中日',
  'ヤクルト',
  'オリックス',
  'ソフトバンク',
  'ロッテ',
  '楽天',
  '西武',
  '日本ハム'
);
