CREATE TABLE `game_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`game_date` text NOT NULL,
	`league` text NOT NULL,
	`home_team` text NOT NULL,
	`away_team` text NOT NULL,
	`home_score` integer,
	`away_score` integer,
	`status` text NOT NULL,
	`winner` text,
	`stadium` text,
	`snapshot_date` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_results_season_date_home_away_idx` ON `game_results` (`season_id`,`game_date`,`home_team`,`away_team`);--> statement-breakpoint
CREATE TABLE `scrape_failure_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`error_message` text,
	`http_status` integer,
	`html_snippet` text,
	`resolved_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
