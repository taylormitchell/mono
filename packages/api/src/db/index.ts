import "dotenv/config";
import { sql } from "drizzle-orm";
import { BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import { replicacheServer } from "./schema";
import { eq } from "drizzle-orm";
import { log } from "src/lib/log";
let _db: BunSQLiteDatabase | null = null;

export const serverID = 1;

export function getDb(): BunSQLiteDatabase {
  if (!_db) {
    if (!process.env.DB_FILE_NAME) {
      throw new Error("DB_FILE_NAME is not set");
    }
    _db = drizzle(process.env.DB_FILE_NAME);
    log.info("Inserting server ID into database");
    _db.insert(replicacheServer).values({ id: serverID, version: 0 });
  }
  return _db;
}

export async function resetDb() {
  _db = null;
}

export function getServerVersion() {
  const db = getDb();
  const result = db
    .select({ version: replicacheServer.version })
    .from(replicacheServer)
    .where(eq(replicacheServer.id, serverID))
    .get();
  return result?.version;
}

export async function withTransaction<T>(cb: (db: BunSQLiteDatabase) => Promise<T>): Promise<T> {
  const db = getDb();
  db.run(sql`BEGIN TRANSACTION`);
  try {
    const result = await cb(db);
    db.run(sql`COMMIT`);
    return result;
  } catch (e) {
    await db.run(sql`ROLLBACK`);
    throw e;
  }
}
