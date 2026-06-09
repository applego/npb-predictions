-- Superseded by drizzle/0003_add_rank_to_score_snapshots.sql.
--
-- This file existed on main as a production repair migration after a historical
-- branch drift. Fresh databases now get score_snapshots.rank from 0003, so this
-- migration must remain a no-op to keep dev->main CI reproducible.

SELECT 1;
