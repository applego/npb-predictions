-- seed-players.sql
-- NPB 12 球団 主力 5 名ずつ = 60 名 (Phase 0 初期データ)
-- 2026 シーズン主力。タイトル予想 combobox で「実在選手を確実に選択」体験のため。
-- Phase 2 で GH Actions scraper が全 ~840 名追従する設計。
-- INSERT OR IGNORE で repeatable (npb_id unique で重複防止、未設定は name で重複チェック不可なので OK と割り切る)

-- ════════════════════════════
-- セ・リーグ
-- ════════════════════════════

-- 阪神タイガース
INSERT OR IGNORE INTO players (name, name_kana, team_name, position, uniform_number, last_seen_at, source_url) VALUES
('佐藤 輝明', 'サトウ テルアキ', '阪神タイガース', '内野手', '8', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_t.html'),
('大山 悠輔', 'オオヤマ ユウスケ', '阪神タイガース', '内野手', '3', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_t.html'),
('近本 光司', 'チカモト コウジ', '阪神タイガース', '外野手', '5', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_t.html'),
('村上 頌樹', 'ムラカミ ショウキ', '阪神タイガース', '投手', '11', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_t.html'),
('才木 浩人', 'サイキ ヒロト', '阪神タイガース', '投手', '46', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_t.html');

-- 読売ジャイアンツ
INSERT OR IGNORE INTO players (name, name_kana, team_name, position, uniform_number, last_seen_at, source_url) VALUES
('岡本 和真', 'オカモト カズマ', '読売ジャイアンツ', '内野手', '25', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_g.html'),
('坂本 勇人', 'サカモト ハヤト', '読売ジャイアンツ', '内野手', '6', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_g.html'),
('丸 佳浩', 'マル ヨシヒロ', '読売ジャイアンツ', '外野手', '8', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_g.html'),
('戸郷 翔征', 'トゴウ ショウセイ', '読売ジャイアンツ', '投手', '20', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_g.html'),
('菅野 智之', 'スガノ トモユキ', '読売ジャイアンツ', '投手', '18', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_g.html');

-- 横浜DeNAベイスターズ
INSERT OR IGNORE INTO players (name, name_kana, team_name, position, uniform_number, last_seen_at, source_url) VALUES
('牧 秀悟', 'マキ シュウゴ', '横浜DeNAベイスターズ', '内野手', '2', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_db.html'),
('佐野 恵太', 'サノ ケイタ', '横浜DeNAベイスターズ', '外野手', '7', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_db.html'),
('宮﨑 敏郎', 'ミヤザキ トシロウ', '横浜DeNAベイスターズ', '内野手', '51', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_db.html'),
('東 克樹', 'アズマ カツキ', '横浜DeNAベイスターズ', '投手', '11', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_db.html'),
('今永 昇太', 'イマナガ ショウタ', '横浜DeNAベイスターズ', '投手', '21', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_db.html');

-- 広島東洋カープ
INSERT OR IGNORE INTO players (name, name_kana, team_name, position, uniform_number, last_seen_at, source_url) VALUES
('小園 海斗', 'コゾノ カイト', '広島東洋カープ', '内野手', '51', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_c.html'),
('秋山 翔吾', 'アキヤマ ショウゴ', '広島東洋カープ', '外野手', '9', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_c.html'),
('坂倉 将吾', 'サカクラ ショウゴ', '広島東洋カープ', '捕手', '27', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_c.html'),
('床田 寛樹', 'トコダ ヒロキ', '広島東洋カープ', '投手', '14', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_c.html'),
('森下 暢仁', 'モリシタ マサト', '広島東洋カープ', '投手', '18', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_c.html');

-- 中日ドラゴンズ
INSERT OR IGNORE INTO players (name, name_kana, team_name, position, uniform_number, last_seen_at, source_url) VALUES
('細川 成也', 'ホソカワ セイヤ', '中日ドラゴンズ', '外野手', '51', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_d.html'),
('岡林 勇希', 'オカバヤシ ユウキ', '中日ドラゴンズ', '外野手', '37', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_d.html'),
('中田 翔', 'ナカタ ショウ', '中日ドラゴンズ', '内野手', '6', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_d.html'),
('髙橋 宏斗', 'タカハシ ヒロト', '中日ドラゴンズ', '投手', '19', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_d.html'),
('柳 裕也', 'ヤナギ ユウヤ', '中日ドラゴンズ', '投手', '17', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_d.html');

-- ヤクルトスワローズ
INSERT OR IGNORE INTO players (name, name_kana, team_name, position, uniform_number, last_seen_at, source_url) VALUES
('村上 宗隆', 'ムラカミ ムネタカ', 'ヤクルトスワローズ', '内野手', '55', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_s.html'),
('山田 哲人', 'ヤマダ テツト', 'ヤクルトスワローズ', '内野手', '1', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_s.html'),
('塩見 泰隆', 'シオミ ヤスタカ', 'ヤクルトスワローズ', '外野手', '9', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_s.html'),
('小川 泰弘', 'オガワ ヤスヒロ', 'ヤクルトスワローズ', '投手', '29', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_s.html'),
('奥川 恭伸', 'オクガワ ヤスノブ', 'ヤクルトスワローズ', '投手', '11', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_s.html');

-- ════════════════════════════
-- パ・リーグ
-- ════════════════════════════

-- 福岡ソフトバンクホークス
INSERT OR IGNORE INTO players (name, name_kana, team_name, position, uniform_number, last_seen_at, source_url) VALUES
('近藤 健介', 'コンドウ ケンスケ', '福岡ソフトバンクホークス', '外野手', '3', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_h.html'),
('山川 穂高', 'ヤマカワ ホタカ', '福岡ソフトバンクホークス', '内野手', '50', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_h.html'),
('柳田 悠岐', 'ヤナギタ ユウキ', '福岡ソフトバンクホークス', '外野手', '9', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_h.html'),
('有原 航平', 'アリハラ コウヘイ', '福岡ソフトバンクホークス', '投手', '17', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_h.html'),
('モイネロ', 'モイネロ', '福岡ソフトバンクホークス', '投手', '52', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_h.html');

-- オリックス・バファローズ
INSERT OR IGNORE INTO players (name, name_kana, team_name, position, uniform_number, last_seen_at, source_url) VALUES
('森 友哉', 'モリ トモヤ', 'オリックス・バファローズ', '捕手', '4', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_b.html'),
('紅林 弘太郎', 'クレバヤシ コウタロウ', 'オリックス・バファローズ', '内野手', '24', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_b.html'),
('頓宮 裕真', 'トングウ ユウマ', 'オリックス・バファローズ', '内野手', '44', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_b.html'),
('宮城 大弥', 'ミヤギ ヒロヤ', 'オリックス・バファローズ', '投手', '13', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_b.html'),
('山本 由伸', 'ヤマモト ヨシノブ', 'オリックス・バファローズ', '投手', '18', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_b.html');

-- 千葉ロッテマリーンズ
INSERT OR IGNORE INTO players (name, name_kana, team_name, position, uniform_number, last_seen_at, source_url) VALUES
('藤原 恭大', 'フジワラ キョウタ', '千葉ロッテマリーンズ', '外野手', '32', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_m.html'),
('安田 尚憲', 'ヤスダ ヒサノリ', '千葉ロッテマリーンズ', '内野手', '5', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_m.html'),
('中村 奨吾', 'ナカムラ ショウゴ', '千葉ロッテマリーンズ', '内野手', '8', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_m.html'),
('佐々木 朗希', 'ササキ ロウキ', '千葉ロッテマリーンズ', '投手', '17', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_m.html'),
('小島 和哉', 'コジマ カズヤ', '千葉ロッテマリーンズ', '投手', '14', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_m.html');

-- 東北楽天ゴールデンイーグルス
INSERT OR IGNORE INTO players (name, name_kana, team_name, position, uniform_number, last_seen_at, source_url) VALUES
('浅村 栄斗', 'アサムラ ヒデト', '東北楽天ゴールデンイーグルス', '内野手', '3', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_e.html'),
('島内 宏明', 'シマウチ ヒロアキ', '東北楽天ゴールデンイーグルス', '外野手', '9', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_e.html'),
('小郷 裕哉', 'オゴウ ヒロヤ', '東北楽天ゴールデンイーグルス', '外野手', '0', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_e.html'),
('早川 隆久', 'ハヤカワ タカヒサ', '東北楽天ゴールデンイーグルス', '投手', '17', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_e.html'),
('則本 昂大', 'ノリモト タカヒロ', '東北楽天ゴールデンイーグルス', '投手', '14', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_e.html');

-- 埼玉西武ライオンズ
INSERT OR IGNORE INTO players (name, name_kana, team_name, position, uniform_number, last_seen_at, source_url) VALUES
('源田 壮亮', 'ゲンダ ソウスケ', '埼玉西武ライオンズ', '内野手', '6', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_l.html'),
('外崎 修汰', 'トノサキ シュウタ', '埼玉西武ライオンズ', '内野手', '5', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_l.html'),
('栗山 巧', 'クリヤマ タクミ', '埼玉西武ライオンズ', '外野手', '1', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_l.html'),
('髙橋 光成', 'タカハシ コウナ', '埼玉西武ライオンズ', '投手', '13', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_l.html'),
('今井 達也', 'イマイ タツヤ', '埼玉西武ライオンズ', '投手', '11', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_l.html');

-- 北海道日本ハムファイターズ
INSERT OR IGNORE INTO players (name, name_kana, team_name, position, uniform_number, last_seen_at, source_url) VALUES
('万波 中正', 'マンナミ チュウセイ', '北海道日本ハムファイターズ', '外野手', '50', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_f.html'),
('松本 剛', 'マツモト ゴウ', '北海道日本ハムファイターズ', '外野手', '7', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_f.html'),
('清宮 幸太郎', 'キヨミヤ コウタロウ', '北海道日本ハムファイターズ', '内野手', '21', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_f.html'),
('伊藤 大海', 'イトウ ヒロミ', '北海道日本ハムファイターズ', '投手', '17', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_f.html'),
('加藤 貴之', 'カトウ タカユキ', '北海道日本ハムファイターズ', '投手', '14', CURRENT_TIMESTAMP, 'https://npb.jp/bis/teams/rst_f.html');
