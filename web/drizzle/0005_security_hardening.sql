-- Security hardening migration.
-- 1. Backfill predictions.variant NULL -> 'default' so the (user_id, season_id, variant)
--    unique index can enforce one prediction per friend per season.
--    SQLite treats NULLs as distinct, so without this fix, multiple NULL-variant rows
--    can coexist and bypass the constraint.
-- 2. Add a partial unique index on users.firebase_uid for verified, linked users.
--    Partial (WHERE firebase_uid IS NOT NULL) so legacy users with no Firebase link
--    remain valid until they sign in.

UPDATE `predictions` SET `variant` = 'default' WHERE `variant` IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `users_firebase_uid_unique_idx` ON `users` (`firebase_uid`) WHERE `firebase_uid` IS NOT NULL;
