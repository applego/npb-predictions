CREATE TABLE `affiliate_clicks` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `resource_id` text NOT NULL,
  `category` text NOT NULL,
  `provider` text NOT NULL,
  `href` text NOT NULL,
  `path` text,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL
);

CREATE INDEX `affiliate_clicks_resource_created_idx`
  ON `affiliate_clicks` (`resource_id`, `created_at`);

CREATE INDEX `affiliate_clicks_created_idx`
  ON `affiliate_clicks` (`created_at`);
