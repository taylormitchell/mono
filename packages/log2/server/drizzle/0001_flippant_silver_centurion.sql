CREATE TABLE "view" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"filter" jsonb,
	"sort" jsonb,
	"positions" jsonb,
	"version" integer DEFAULT 0 NOT NULL,
	"deleted_at" text
);
