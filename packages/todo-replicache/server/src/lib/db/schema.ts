import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";

export const replicacheServerTable = pgTable("replicache_server", {
  id: serial("id").primaryKey(),
  version: integer("version").notNull(),
});

export const itemTable = pgTable("item", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  dueDate: text("due_date"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
  status: text("status"),
  version: integer("version").notNull().default(0),
});

export const replicacheClientTable = pgTable("replicache_client", {
  id: text("id").primaryKey(),
  clientGroupID: text("client_group_id").notNull(),
  lastMutationID: integer("last_mutation_id").notNull(),
  version: integer("version").notNull(),
});
