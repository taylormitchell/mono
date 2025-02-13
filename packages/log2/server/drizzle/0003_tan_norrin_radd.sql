CREATE TABLE "logs" (
	"id" text PRIMARY KEY NOT NULL,
	"data" jsonb,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"deleted_at" text,
	"version" integer DEFAULT 0 NOT NULL
);
