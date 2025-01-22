import "dotenv/config";
import { BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import { replicacheClientTable, replicacheServerTable, todoTable } from "./schema";
import { sql, eq } from "drizzle-orm";
let _db: BunSQLiteDatabase | null = null;

export const serverID = 1;
export async function getDb(): Promise<BunSQLiteDatabase> {
  if (!_db) {
    if (!process.env.DB_FILE_NAME) {
      throw new Error("DB_FILE_NAME is not set");
    }
    // Configure SQLite for serializable isolation
    _db = drizzle(process.env.DB_FILE_NAME);

    _db.run("PRAGMA journal_mode=WAL"); // Enable Write-Ahead Logging
    _db.run("PRAGMA synchronous=NORMAL"); // Balance durability and performance
    _db.run("PRAGMA read_uncommitted=0"); // Ensure serializable isolation

    // Initialize server version in a transaction
    await _db.transaction(async (tx) => {
      await tx
        .insert(replicacheServerTable)
        .values({ id: serverID, version: 0 })
        .onConflictDoNothing();
    });
  }
  return _db;
}

export async function resetDb() {
  _db = null;
}

export async function getServerVersion(db: BunSQLiteDatabase): Promise<number> {
  const result = db
    .select({ version: replicacheServerTable.version })
    .from(replicacheServerTable)
    .where(eq(replicacheServerTable.id, serverID))
    .get();
  return result?.version ?? 0;
}

export async function getLastMutationID(db: BunSQLiteDatabase, clientID: string): Promise<number> {
  const result = db
    .select({ lastMutationID: replicacheClientTable.lastMutationID })
    .from(replicacheClientTable)
    .where(eq(replicacheClientTable.id, clientID))
    .get();
  return result?.lastMutationID ?? 0;
}

export async function getLastMutationIDChanges(
  db: BunSQLiteDatabase,
  clientGroupID: string
): Promise<Record<string, number>> {
  const result = db
    .select({ id: replicacheClientTable.id, lastMutationID: replicacheClientTable.lastMutationID })
    .from(replicacheClientTable)
    .where(eq(replicacheClientTable.clientGroupID, clientGroupID))
    .all();
  return Object.fromEntries(result.map((r) => [r.id, r.lastMutationID]));
}

export async function setLastMutationID(
  db: BunSQLiteDatabase,
  clientID: string,
  clientGroupID: string,
  mutationID: number,
  version: number
) {
  return await db
    .insert(replicacheClientTable)
    .values({ id: clientID, clientGroupID, lastMutationID: mutationID, version })
    .onConflictDoUpdate({
      target: [replicacheClientTable.id],
      set: { clientGroupID, lastMutationID: mutationID, version },
    });
}

export async function setServerVersion(db: BunSQLiteDatabase, version: number) {
  return await db
    .insert(replicacheServerTable)
    .values({ id: serverID, version })
    .onConflictDoUpdate({
      target: [replicacheServerTable.id],
      set: { version },
    });
}

export async function summary() {
  const db = await getDb();
  const todoCount = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(todoTable)
    .get();
  const version = db
    .select({ version: replicacheServerTable.version })
    .from(replicacheServerTable)
    .where(eq(replicacheServerTable.id, serverID))
    .get()?.version;
  return { todoCount: todoCount?.count ?? 0, version };
}
