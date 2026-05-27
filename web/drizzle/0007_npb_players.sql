-- 0007_npb_players.sql
-- NPB 12 球団 全選手リスト
-- Phase 0: schema + 静的 seed (主力 60 名)
-- Phase 2: GH Actions daily scraper で全 ~840 名追従 (別 PR)

CREATE TABLE IF NOT EXISTS `players` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `npb_id` text,                     -- npb.jp 内 ID (Phase 2 scraper で埋める)
  `name` text NOT NULL,              -- 公式表記 (姓 名、半角スペース)
  `name_kana` text,                  -- フリガナ (検索高速化)
  `team_name` text NOT NULL,         -- lib/teams.ts canonical 名と一致 (例: 阪神タイガース)
  `position` text,                   -- 投手/捕手/内野手/外野手
  `uniform_number` text,
  `bats` text,                       -- 右/左/両
  `throws` text,                     -- 右/左
  `is_active` integer NOT NULL DEFAULT 1,  -- 0=退団/抹消、過去予想の歴史保持
  `source_url` text,
  `last_seen_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS `players_npb_id_uniq` ON `players` (`npb_id`);
CREATE INDEX IF NOT EXISTS `players_team_active_idx` ON `players` (`team_name`, `is_active`);
CREATE INDEX IF NOT EXISTS `players_name_idx` ON `players` (`name`);
CREATE INDEX IF NOT EXISTS `players_name_kana_idx` ON `players` (`name_kana`);
