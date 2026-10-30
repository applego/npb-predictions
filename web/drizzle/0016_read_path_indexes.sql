-- D1 rows_read reduction: season-scoped lookups must not scan whole tables.
CREATE INDEX IF NOT EXISTS predictions_season_locked_idx ON predictions(season_id, is_locked);
CREATE INDEX IF NOT EXISTS score_snapshots_season_user_total_idx ON score_snapshots(season_id, user_id, total_score);

-- Public aggregates are served from one row per key (lib/computed-cache.ts).
CREATE TABLE IF NOT EXISTS computed_cache (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  computed_at INTEGER NOT NULL,
  -- data_changes.changed_at observed when the compute started
  basis INTEGER NOT NULL,
  claimed_at INTEGER
);

-- Any write to scored data marks every cached aggregate stale (millisecond
-- clock). The WHERE keeps bulk imports at one write per ms, not per row.
CREATE TABLE IF NOT EXISTS data_changes (
  id INTEGER PRIMARY KEY NOT NULL,
  changed_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO data_changes (id, changed_at) VALUES (1, 0);
CREATE TRIGGER IF NOT EXISTS seasons_insert_marks_cache_stale AFTER INSERT ON seasons BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS seasons_update_marks_cache_stale AFTER UPDATE ON seasons BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS seasons_delete_marks_cache_stale AFTER DELETE ON seasons BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS users_insert_marks_cache_stale AFTER INSERT ON users BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS users_update_marks_cache_stale AFTER UPDATE ON users BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS users_delete_marks_cache_stale AFTER DELETE ON users BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS predictions_insert_marks_cache_stale AFTER INSERT ON predictions BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS predictions_update_marks_cache_stale AFTER UPDATE ON predictions BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS predictions_delete_marks_cache_stale AFTER DELETE ON predictions BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS ranking_picks_insert_marks_cache_stale AFTER INSERT ON ranking_picks BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS ranking_picks_update_marks_cache_stale AFTER UPDATE ON ranking_picks BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS ranking_picks_delete_marks_cache_stale AFTER DELETE ON ranking_picks BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS title_picks_insert_marks_cache_stale AFTER INSERT ON title_picks BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS title_picks_update_marks_cache_stale AFTER UPDATE ON title_picks BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS title_picks_delete_marks_cache_stale AFTER DELETE ON title_picks BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS actual_team_standings_insert_marks_cache_stale AFTER INSERT ON actual_team_standings BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS actual_team_standings_update_marks_cache_stale AFTER UPDATE ON actual_team_standings BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS actual_team_standings_delete_marks_cache_stale AFTER DELETE ON actual_team_standings BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS actual_title_snapshots_insert_marks_cache_stale AFTER INSERT ON actual_title_snapshots BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS actual_title_snapshots_update_marks_cache_stale AFTER UPDATE ON actual_title_snapshots BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS actual_title_snapshots_delete_marks_cache_stale AFTER DELETE ON actual_title_snapshots BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS score_snapshots_insert_marks_cache_stale AFTER INSERT ON score_snapshots BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS score_snapshots_update_marks_cache_stale AFTER UPDATE ON score_snapshots BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS score_snapshots_delete_marks_cache_stale AFTER DELETE ON score_snapshots BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS battle_groups_insert_marks_cache_stale AFTER INSERT ON battle_groups BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS battle_groups_update_marks_cache_stale AFTER UPDATE ON battle_groups BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS battle_groups_delete_marks_cache_stale AFTER DELETE ON battle_groups BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS battle_group_members_insert_marks_cache_stale AFTER INSERT ON battle_group_members BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS battle_group_members_update_marks_cache_stale AFTER UPDATE ON battle_group_members BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
CREATE TRIGGER IF NOT EXISTS battle_group_members_delete_marks_cache_stale AFTER DELETE ON battle_group_members BEGIN UPDATE data_changes SET changed_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = 1 AND changed_at < CAST(unixepoch('subsec') * 1000 AS INTEGER); END;
