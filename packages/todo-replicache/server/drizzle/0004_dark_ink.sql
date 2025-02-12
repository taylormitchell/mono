DROP TABLE "logs" CASCADE;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "content_type" text DEFAULT 'markdown' NOT NULL;