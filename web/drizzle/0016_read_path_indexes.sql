-- D1 rows_read reduction: season-scoped lookups must not scan whole tables.
CREATE INDEX IF NOT EXISTS predictions_season_locked_idx ON predictions(season_id, is_locked);
CREATE INDEX IF NOT EXISTS score_snapshots_season_user_total_idx ON score_snapshots(season_id, user_id, total_score);
-- Whole-table aggregates are served from one row per key until the TTL expires.
CREATE TABLE IF NOT EXISTS computed_cache (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  computed_at INTEGER NOT NULL
);
