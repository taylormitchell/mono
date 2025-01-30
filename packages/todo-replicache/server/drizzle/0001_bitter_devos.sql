ALTER TABLE `todo` RENAME TO `item`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_item` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`due_date` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`status` text,
	`version` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_item`("id", "content", "due_date", "created_at", "updated_at", "deleted_at", "status", "version") SELECT "id", "content", "due_date", "created_at", "updated_at", "deleted_at", "status", "version" FROM `item`;--> statement-breakpoint
DROP TABLE `item`;--> statement-breakpoint
ALTER TABLE `__new_item` RENAME TO `item`;--> statement-breakpoint
PRAGMA foreign_keys=ON;