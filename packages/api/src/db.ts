import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { Database } from "sqlite3";

export const serverID = 1;

let _db: LibSQLDatabase | null = null;

// Define schema
export const replicacheServer = sqliteTable("replicache_server", {
  id: integer("id").primaryKey(),
  version: integer("version").notNull(),
});

export const todo = sqliteTable("todo", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  dueDate: text("due_date"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  version: integer("version").notNull(),
});

export const replicacheClient = sqliteTable("replicache_client", {
  id: text("id").primaryKey(),
  clientGroupId: text("client_group_id").notNull(),
  lastMutationId: integer("last_mutation_id").notNull(),
  version: integer("version").notNull(),
});

export async function getDB() {
  if (!_db) {
    _db = drizzle(":memory:");
    // Run initial migrations
    const sqliteDb = new Database(":memory:");
    await initDB(sqliteDb);
  }
  return _db;
}

export async function resetDB() {
  _db = null;
}

export async function getServerVersion() {
  const db = await getDB();
  const result = await db
    .select({ version: replicacheServer.version })
    .from(replicacheServer)
    .where(sql`id = ${serverID}`)
    .get();
  return result?.version;
}

export async function withTransaction<T>(
  cb: (db: ReturnType<typeof drizzle>) => Promise<T>
): Promise<T> {
  const db = await getDB();
  await db.run(sql`BEGIN TRANSACTION`);
  try {
    const result = await cb(db);
    await db.run(sql`COMMIT`);
    return result;
  } catch (e) {
    await db.run(sql`ROLLBACK`);
    throw e;
  }
}
