CREATE TABLE "prompt" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"deleted_at" text,
	"text" text DEFAULT '' NOT NULL,
	"version" integer DEFAULT 0 NOT NULL
);
