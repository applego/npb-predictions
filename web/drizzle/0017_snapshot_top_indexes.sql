-- D1 rows_read reduction: the OG aggregates (lib/og-snapshots.ts) read only
-- the top rows / a single day of score_snapshots per season instead of the
-- whole season. These indexes make those bounded reads seeks, not scans:
--   season_total: walk a season in total_score order and stop after a page
--   season_date:  jump to a season's latest snapshot day, read that day only
CREATE INDEX IF NOT EXISTS score_snapshots_season_total_idx ON score_snapshots(season_id, total_score, user_id);
CREATE INDEX IF NOT EXISTS score_snapshots_season_date_idx ON score_snapshots(season_id, snapshot_date, user_id);
