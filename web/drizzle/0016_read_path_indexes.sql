-- D1 rows_read reduction: season-scoped lookups must not scan whole tables.
CREATE INDEX IF NOT EXISTS predictions_season_locked_idx ON predictions(season_id, is_locked);
CREATE INDEX IF NOT EXISTS score_snapshots_season_user_total_idx ON score_snapshots(season_id, user_id, total_score);
CREATE INDEX IF NOT EXISTS battle_group_members_user_idx ON battle_group_members(user_id);
CREATE INDEX IF NOT EXISTS awards_season_type_month_idx ON awards(season_id, type, month);

-- Public aggregates are served from one row per key (lib/computed-cache.ts).
CREATE TABLE IF NOT EXISTS computed_cache (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  computed_at INTEGER NOT NULL,
  -- sum of the change counters the result depends on, read before computing
  basis INTEGER NOT NULL,
  claimed_at INTEGER,
  -- token of the request currently recomputing this key
  lease TEXT,
  -- >1 when the value is split across rows "<key>#<gen>#<i>" (2 MB limit)
  parts INTEGER NOT NULL DEFAULT 1,
  -- lease token of the request that published the current value
  gen TEXT
);
CREATE INDEX IF NOT EXISTS computed_cache_computed_at_idx ON computed_cache(computed_at);

-- Change counters, advanced by triggers on every relevant row write:
--   id = season year   locked predictions/picks, standings, titles, scores
--   id = -season year  unlocked (draft) predictions and their picks
--   id = 0             seasons, and users updated or deleted (every season)
--   id = -1            users inserted (only the sitemap depends on sign-ups)
-- A cached result is fresh while the counters it depends on are unchanged,
-- so a 2026 standings update does not recompute 2014-2025 results, and
-- drafts and sign-ups only affect the aggregates that include them.
CREATE TABLE IF NOT EXISTS data_changes (
  id INTEGER PRIMARY KEY NOT NULL,
  changed_at INTEGER NOT NULL
);
CREATE TRIGGER IF NOT EXISTS seasons_insert_marks_cache_stale AFTER INSERT ON seasons BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE(0, 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS seasons_update_marks_cache_stale AFTER UPDATE ON seasons BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE(0, 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS seasons_delete_marks_cache_stale AFTER DELETE ON seasons BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE(0, 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS users_insert_marks_cache_stale AFTER INSERT ON users BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE(-1, 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS users_update_marks_cache_stale AFTER UPDATE ON users BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE(0, 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS users_delete_marks_cache_stale AFTER DELETE ON users BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE(0, 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS actual_team_standings_insert_marks_cache_stale AFTER INSERT ON actual_team_standings BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((SELECT year FROM seasons WHERE id = NEW.season_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS actual_team_standings_update_marks_cache_stale AFTER UPDATE ON actual_team_standings BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((SELECT year FROM seasons WHERE id = NEW.season_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS actual_team_standings_update_old_scope_marks_cache_stale AFTER UPDATE ON actual_team_standings WHEN OLD.season_id IS NOT NEW.season_id BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((SELECT year FROM seasons WHERE id = OLD.season_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS actual_team_standings_delete_marks_cache_stale AFTER DELETE ON actual_team_standings BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((SELECT year FROM seasons WHERE id = OLD.season_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS actual_title_snapshots_insert_marks_cache_stale AFTER INSERT ON actual_title_snapshots BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((SELECT year FROM seasons WHERE id = NEW.season_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS actual_title_snapshots_update_marks_cache_stale AFTER UPDATE ON actual_title_snapshots BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((SELECT year FROM seasons WHERE id = NEW.season_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS actual_title_snapshots_update_old_scope_marks_cache_stale AFTER UPDATE ON actual_title_snapshots WHEN OLD.season_id IS NOT NEW.season_id BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((SELECT year FROM seasons WHERE id = OLD.season_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS actual_title_snapshots_delete_marks_cache_stale AFTER DELETE ON actual_title_snapshots BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((SELECT year FROM seasons WHERE id = OLD.season_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS score_snapshots_insert_marks_cache_stale AFTER INSERT ON score_snapshots BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((SELECT year FROM seasons WHERE id = NEW.season_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS score_snapshots_update_marks_cache_stale AFTER UPDATE ON score_snapshots BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((SELECT year FROM seasons WHERE id = NEW.season_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS score_snapshots_update_old_scope_marks_cache_stale AFTER UPDATE ON score_snapshots WHEN OLD.season_id IS NOT NEW.season_id BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((SELECT year FROM seasons WHERE id = OLD.season_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS score_snapshots_delete_marks_cache_stale AFTER DELETE ON score_snapshots BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((SELECT year FROM seasons WHERE id = OLD.season_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS predictions_insert_marks_cache_stale AFTER INSERT ON predictions BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((CASE WHEN NEW.is_locked = 1 THEN 1 ELSE -1 END) * (SELECT year FROM seasons WHERE id = NEW.season_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS predictions_update_marks_cache_stale AFTER UPDATE ON predictions BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((CASE WHEN NEW.is_locked = 1 THEN 1 ELSE -1 END) * (SELECT year FROM seasons WHERE id = NEW.season_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS predictions_update_old_scope_marks_cache_stale AFTER UPDATE ON predictions WHEN OLD.season_id IS NOT NEW.season_id OR OLD.is_locked IS NOT NEW.is_locked BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((CASE WHEN OLD.is_locked = 1 THEN 1 ELSE -1 END) * (SELECT year FROM seasons WHERE id = OLD.season_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS predictions_delete_marks_cache_stale AFTER DELETE ON predictions BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((CASE WHEN OLD.is_locked = 1 THEN 1 ELSE -1 END) * (SELECT year FROM seasons WHERE id = OLD.season_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS ranking_picks_insert_marks_cache_stale AFTER INSERT ON ranking_picks BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((SELECT (CASE WHEN p.is_locked = 1 THEN 1 ELSE -1 END) * s.year FROM predictions p JOIN seasons s ON s.id = p.season_id WHERE p.id = NEW.prediction_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS ranking_picks_update_marks_cache_stale AFTER UPDATE ON ranking_picks BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((SELECT (CASE WHEN p.is_locked = 1 THEN 1 ELSE -1 END) * s.year FROM predictions p JOIN seasons s ON s.id = p.season_id WHERE p.id = NEW.prediction_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS ranking_picks_update_old_scope_marks_cache_stale AFTER UPDATE ON ranking_picks WHEN OLD.prediction_id IS NOT NEW.prediction_id BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((SELECT (CASE WHEN p.is_locked = 1 THEN 1 ELSE -1 END) * s.year FROM predictions p JOIN seasons s ON s.id = p.season_id WHERE p.id = OLD.prediction_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS ranking_picks_delete_marks_cache_stale AFTER DELETE ON ranking_picks WHEN EXISTS (SELECT 1 FROM predictions WHERE id = OLD.prediction_id) BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((SELECT (CASE WHEN p.is_locked = 1 THEN 1 ELSE -1 END) * s.year FROM predictions p JOIN seasons s ON s.id = p.season_id WHERE p.id = OLD.prediction_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS title_picks_insert_marks_cache_stale AFTER INSERT ON title_picks BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((SELECT (CASE WHEN p.is_locked = 1 THEN 1 ELSE -1 END) * s.year FROM predictions p JOIN seasons s ON s.id = p.season_id WHERE p.id = NEW.prediction_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS title_picks_update_marks_cache_stale AFTER UPDATE ON title_picks BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((SELECT (CASE WHEN p.is_locked = 1 THEN 1 ELSE -1 END) * s.year FROM predictions p JOIN seasons s ON s.id = p.season_id WHERE p.id = NEW.prediction_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS title_picks_update_old_scope_marks_cache_stale AFTER UPDATE ON title_picks WHEN OLD.prediction_id IS NOT NEW.prediction_id BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((SELECT (CASE WHEN p.is_locked = 1 THEN 1 ELSE -1 END) * s.year FROM predictions p JOIN seasons s ON s.id = p.season_id WHERE p.id = OLD.prediction_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
CREATE TRIGGER IF NOT EXISTS title_picks_delete_marks_cache_stale AFTER DELETE ON title_picks WHEN EXISTS (SELECT 1 FROM predictions WHERE id = OLD.prediction_id) BEGIN INSERT INTO data_changes (id, changed_at) VALUES (COALESCE((SELECT (CASE WHEN p.is_locked = 1 THEN 1 ELSE -1 END) * s.year FROM predictions p JOIN seasons s ON s.id = p.season_id WHERE p.id = OLD.prediction_id), 0), 1) ON CONFLICT (id) DO UPDATE SET changed_at = data_changes.changed_at + 1; END;
