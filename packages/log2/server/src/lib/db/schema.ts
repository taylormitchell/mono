import { pgTable, serial, text, integer, jsonb } from "drizzle-orm/pg-core";
import type { LogData } from "../../../../shared/types";

export const logTable = pgTable("log", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
  text: text("text").notNull().default(""),
  data: jsonb("data").$type<LogData>(),
  version: integer("version").notNull().default(0),
});

export const replicacheServerTable = pgTable("replicache_server", {
  id: serial("id").primaryKey(),
  version: integer("version").notNull(),
});

export const replicacheClientTable = pgTable("replicache_client", {
  id: text("id").primaryKey(),
  clientGroupID: text("client_group_id").notNull(),
  lastMutationID: integer("last_mutation_id").notNull(),
  version: integer("version").notNull(),
});
