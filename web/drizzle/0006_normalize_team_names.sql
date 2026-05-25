-- Normalize team_name in ranking_picks / title_picks from shortName to canonical full name
-- so they always match actual_team_standings (which uses fullName from npb.jp scraper).
--
-- Without this, scoring used to hit a defensive normalizeTeamName() helper at read time;
-- with the data normalized, lookups are simpler and seed/import paths can rely on a single
-- canonical form going forward.

UPDATE `ranking_picks` SET `team_name` = '読売ジャイアンツ'            WHERE `team_name` = '巨人';
--> statement-breakpoint
UPDATE `ranking_picks` SET `team_name` = '阪神タイガース'              WHERE `team_name` = '阪神';
--> statement-breakpoint
UPDATE `ranking_picks` SET `team_name` = '横浜DeNAベイスターズ'        WHERE `team_name` = 'DeNA';
--> statement-breakpoint
UPDATE `ranking_picks` SET `team_name` = '広島東洋カープ'              WHERE `team_name` = '広島';
--> statement-breakpoint
UPDATE `ranking_picks` SET `team_name` = '中日ドラゴンズ'              WHERE `team_name` = '中日';
--> statement-breakpoint
UPDATE `ranking_picks` SET `team_name` = '東京ヤクルトスワローズ'      WHERE `team_name` = 'ヤクルト';
--> statement-breakpoint
UPDATE `ranking_picks` SET `team_name` = 'オリックス・バファローズ'    WHERE `team_name` = 'オリックス';
--> statement-breakpoint
UPDATE `ranking_picks` SET `team_name` = '福岡ソフトバンクホークス'    WHERE `team_name` = 'ソフトバンク';
--> statement-breakpoint
UPDATE `ranking_picks` SET `team_name` = '千葉ロッテマリーンズ'        WHERE `team_name` = 'ロッテ';
--> statement-breakpoint
UPDATE `ranking_picks` SET `team_name` = '東北楽天ゴールデンイーグルス' WHERE `team_name` = '楽天';
--> statement-breakpoint
UPDATE `ranking_picks` SET `team_name` = '埼玉西武ライオンズ'          WHERE `team_name` = '西武';
--> statement-breakpoint
UPDATE `ranking_picks` SET `team_name` = '北海道日本ハムファイターズ'  WHERE `team_name` = '日本ハム';
--> statement-breakpoint

-- title_picks.team_name (nullable) — same normalization for the player's team field.
UPDATE `title_picks` SET `team_name` = '読売ジャイアンツ'            WHERE `team_name` = '巨人';
--> statement-breakpoint
UPDATE `title_picks` SET `team_name` = '阪神タイガース'              WHERE `team_name` = '阪神';
--> statement-breakpoint
UPDATE `title_picks` SET `team_name` = '横浜DeNAベイスターズ'        WHERE `team_name` = 'DeNA';
--> statement-breakpoint
UPDATE `title_picks` SET `team_name` = '広島東洋カープ'              WHERE `team_name` = '広島';
--> statement-breakpoint
UPDATE `title_picks` SET `team_name` = '中日ドラゴンズ'              WHERE `team_name` = '中日';
--> statement-breakpoint
UPDATE `title_picks` SET `team_name` = '東京ヤクルトスワローズ'      WHERE `team_name` = 'ヤクルト';
--> statement-breakpoint
UPDATE `title_picks` SET `team_name` = 'オリックス・バファローズ'    WHERE `team_name` = 'オリックス';
--> statement-breakpoint
UPDATE `title_picks` SET `team_name` = '福岡ソフトバンクホークス'    WHERE `team_name` = 'ソフトバンク';
--> statement-breakpoint
UPDATE `title_picks` SET `team_name` = '千葉ロッテマリーンズ'        WHERE `team_name` = 'ロッテ';
--> statement-breakpoint
UPDATE `title_picks` SET `team_name` = '東北楽天ゴールデンイーグルス' WHERE `team_name` = '楽天';
--> statement-breakpoint
UPDATE `title_picks` SET `team_name` = '埼玉西武ライオンズ'          WHERE `team_name` = '西武';
--> statement-breakpoint
UPDATE `title_picks` SET `team_name` = '北海道日本ハムファイターズ'  WHERE `team_name` = '日本ハム';
