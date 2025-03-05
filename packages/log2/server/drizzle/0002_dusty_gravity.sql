ALTER TABLE "log" ALTER COLUMN "data" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "log" ALTER COLUMN "data" SET NOT NULL;