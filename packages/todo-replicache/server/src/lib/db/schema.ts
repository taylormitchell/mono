import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const replicacheServerTable = sqliteTable("replicache_server", {
  id: integer("id").primaryKey(),
  version: integer("version").notNull(),
});

export const todoTable = sqliteTable("todo", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  dueDate: text("due_date"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  labels: text("labels").notNull().default(""),
  version: integer("version").notNull().default(0),
});

export const replicacheClientTable = sqliteTable("replicache_client", {
  id: text("id").primaryKey(),
  clientGroupId: text("client_group_id").notNull(),
  lastMutationId: integer("last_mutation_id").notNull(),
  version: integer("version").notNull(),
});
