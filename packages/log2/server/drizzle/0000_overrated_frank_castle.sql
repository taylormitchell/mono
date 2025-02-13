CREATE TABLE "log" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"deleted_at" text,
	"text" text DEFAULT '' NOT NULL,
	"data" jsonb,
	"version" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replicache_client" (
	"id" text PRIMARY KEY NOT NULL,
	"client_group_id" text NOT NULL,
	"last_mutation_id" integer NOT NULL,
	"version" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replicache_server" (
	"id" serial PRIMARY KEY NOT NULL,
	"version" integer NOT NULL
);
