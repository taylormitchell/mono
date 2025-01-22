import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const replicacheServer = sqliteTable("replicache_server", {
  id: integer("id").primaryKey(),
  version: integer("version").notNull(),
});

export const todo = sqliteTable("todo", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
  version: integer("version").notNull().default(0),
});

export const replicacheClient = sqliteTable("replicache_client", {
  id: text("id").primaryKey(),
  clientGroupId: text("client_group_id").notNull(),
  lastMutationId: integer("last_mutation_id").notNull(),
  version: integer("version").notNull(),
});
