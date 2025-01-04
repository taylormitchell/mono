import "dotenv/config";
import { BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import { replicacheServer, todo } from "./schema";
import { sql, eq } from "drizzle-orm";
let _db: BunSQLiteDatabase | null = null;

export const serverID = 1;

export async function getDb(): Promise<BunSQLiteDatabase> {
  if (!_db) {
    if (!process.env.DB_FILE_NAME) {
      throw new Error("DB_FILE_NAME is not set");
    }
    _db = drizzle(process.env.DB_FILE_NAME);
    await _db.insert(replicacheServer).values({ id: serverID, version: 0 }).onConflictDoNothing();
  }
  return _db;
}

export async function resetDb() {
  _db = null;
}

export async function getServerVersion(): Promise<number | undefined> {
  const db = await getDb();
  const result = db
    .select({ version: replicacheServer.version })
    .from(replicacheServer)
    .where(eq(replicacheServer.id, serverID))
    .get();
  return result?.version;
}

export async function summary() {
  const db = await getDb();
  const todoCount = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(todo)
    .get();
  const version = db
    .select({ version: replicacheServer.version })
    .from(replicacheServer)
    .where(eq(replicacheServer.id, serverID))
    .get()?.version;
  return { todoCount: todoCount?.count ?? 0, version };
}

export async function withTransaction<T>(cb: (db: BunSQLiteDatabase) => Promise<T>): Promise<T> {
  const db = await getDb();
  db.run(sql`BEGIN TRANSACTION`);
  try {
    const result = await cb(db);
    db.run(sql`COMMIT`);
    return result;
  } catch (e) {
    db.run(sql`ROLLBACK`);
    throw e;
  }
}
