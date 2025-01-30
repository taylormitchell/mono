import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const replicacheServerTable = sqliteTable("replicache_server", {
  id: integer("id").primaryKey(),
  version: integer("version").notNull(),
});

export const itemTable = sqliteTable("item", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  dueDate: text("due_date"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
  status: text("status"),
  version: integer("version").notNull().default(0),
});

export const replicacheClientTable = sqliteTable("replicache_client", {
  id: text("id").primaryKey(),
  clientGroupID: text("client_group_id").notNull(),
  lastMutationID: integer("last_mutation_id").notNull(),
  version: integer("version").notNull(),
});
