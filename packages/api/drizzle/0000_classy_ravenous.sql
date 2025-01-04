CREATE TABLE `replicache_client` (
	`id` text PRIMARY KEY NOT NULL,
	`client_group_id` text NOT NULL,
	`last_mutation_id` integer NOT NULL,
	`version` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `replicache_server` (
	`id` integer PRIMARY KEY NOT NULL,
	`version` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `todo` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`due_date` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`labels` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL
);
