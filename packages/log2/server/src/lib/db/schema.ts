import { pgTable, serial, text, integer, jsonb } from "drizzle-orm/pg-core";

export const replicacheServerTable = pgTable("replicache_server", {
  id: serial("id").primaryKey(),
  version: integer("version").notNull(),
});

export const itemTable = pgTable("item", {
  id: text("id").primaryKey(),
  name: text("name").unique(),
  content: text("content").notNull(),
  contentType: text("content_type").notNull().default("markdown"),
  dueDate: text("due_date"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
  status: text("status"),
  version: integer("version").notNull().default(0),
  children: text("children").notNull().default("[]"),
});

export const viewTable = pgTable("view", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  filter: jsonb("filter"),
  sort: jsonb("sort"),
  positions: jsonb("positions"),
  version: integer("version").notNull().default(0),
  deletedAt: text("deleted_at"),
});

export const replicacheClientTable = pgTable("replicache_client", {
  id: text("id").primaryKey(),
  clientGroupID: text("client_group_id").notNull(),
  lastMutationID: integer("last_mutation_id").notNull(),
  version: integer("version").notNull(),
});
