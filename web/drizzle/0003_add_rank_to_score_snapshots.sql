CREATE TABLE `likes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`target_user_id` integer NOT NULL,
	`fingerprint` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `likes_user_fp_idx` ON `likes` (`target_user_id`,`fingerprint`);--> statement-breakpoint
DROP INDEX `predictions_user_season_idx`;--> statement-breakpoint
ALTER TABLE `predictions` ADD `variant` text;--> statement-breakpoint
CREATE UNIQUE INDEX `predictions_user_season_variant_idx` ON `predictions` (`user_id`,`season_id`,`variant`);--> statement-breakpoint
ALTER TABLE `score_snapshots` ADD `rank` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `source_url` text;