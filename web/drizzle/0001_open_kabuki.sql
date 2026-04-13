ALTER TABLE `users` ADD `role` text DEFAULT 'friend' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `source` text;--> statement-breakpoint
ALTER TABLE `users` ADD `variant` text;--> statement-breakpoint
ALTER TABLE `users` ADD `firebase_uid` text;--> statement-breakpoint
ALTER TABLE `users` ADD `email` text;