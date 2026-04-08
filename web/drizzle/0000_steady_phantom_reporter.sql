CREATE TABLE `actual_team_standings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`league` text NOT NULL,
	`rank` integer NOT NULL,
	`team_name` text NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`draws` integer DEFAULT 0 NOT NULL,
	`snapshot_date` integer DEFAULT (unixepoch()) NOT NULL,
	`is_final` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `actual_standings_season_league_rank_date_idx` ON `actual_team_standings` (`season_id`,`league`,`rank`,`snapshot_date`);--> statement-breakpoint
CREATE TABLE `actual_title_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`league` text NOT NULL,
	`category` text NOT NULL,
	`player_name` text NOT NULL,
	`team_name` text,
	`value` real,
	`snapshot_date` integer DEFAULT (unixepoch()) NOT NULL,
	`is_final` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `actual_title_season_league_cat_date_idx` ON `actual_title_snapshots` (`season_id`,`league`,`category`,`snapshot_date`);--> statement-breakpoint
CREATE TABLE `awards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`label` text NOT NULL,
	`month` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `predictions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`season_id` integer NOT NULL,
	`is_locked` integer DEFAULT false NOT NULL,
	`locked_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `predictions_user_season_idx` ON `predictions` (`user_id`,`season_id`);--> statement-breakpoint
CREATE TABLE `ranking_picks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prediction_id` integer NOT NULL,
	`league` text NOT NULL,
	`rank` integer NOT NULL,
	`team_name` text NOT NULL,
	FOREIGN KEY (`prediction_id`) REFERENCES `predictions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ranking_picks_pred_league_rank_idx` ON `ranking_picks` (`prediction_id`,`league`,`rank`);--> statement-breakpoint
CREATE TABLE `score_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`season_id` integer NOT NULL,
	`ranking_score` integer DEFAULT 0 NOT NULL,
	`title_score` integer DEFAULT 0 NOT NULL,
	`total_score` integer DEFAULT 0 NOT NULL,
	`snapshot_date` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `score_user_season_date_idx` ON `score_snapshots` (`user_id`,`season_id`,`snapshot_date`);--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`year` integer NOT NULL,
	`label` text NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`lock_date` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seasons_year_unique` ON `seasons` (`year`);--> statement-breakpoint
CREATE TABLE `title_picks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prediction_id` integer NOT NULL,
	`league` text NOT NULL,
	`category` text NOT NULL,
	`player_name` text NOT NULL,
	`team_name` text,
	FOREIGN KEY (`prediction_id`) REFERENCES `predictions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `title_picks_pred_league_cat_idx` ON `title_picks` (`prediction_id`,`league`,`category`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`avatar_url` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_slug_unique` ON `users` (`slug`);