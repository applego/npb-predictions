-- Add `rank` column to score_snapshots so /api/cron/recalculate can persist
-- per-snapshot ranking (1-based). The schema.ts already declares it; this
-- migration brings production D1 in line with the schema.
--
-- Background: drizzle/0003_add_rank_to_score_snapshots.sql was overwritten at
-- some point with a `likes` table CREATE, leaving prod without the column.

ALTER TABLE `score_snapshots` ADD COLUMN `rank` integer;
