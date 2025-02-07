ALTER TABLE "item" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "children" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_name_unique" UNIQUE("name");