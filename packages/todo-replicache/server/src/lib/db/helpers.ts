import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { replicacheClientTable, replicacheServerTable } from "./schema";
import { eq, gt, and } from "drizzle-orm";
import { newDb } from "pg-mem";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

export const serverID = 1;
export async function getDb() {
  if (!_db) {
    if (process.env.NODE_ENV === "development") {
      // Use pg-mem for development
      const pgmem = newDb();

      // Create tables in memory
      pgmem.public.none(`
        CREATE TABLE replicache_server (
          id SERIAL PRIMARY KEY,
          version INTEGER NOT NULL
        );
        
        CREATE TABLE item (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          due_date TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          status TEXT,
          version INTEGER NOT NULL DEFAULT 0
        );
        
        CREATE TABLE replicache_client (
          id TEXT PRIMARY KEY,
          client_group_id TEXT NOT NULL,
          last_mutation_id INTEGER NOT NULL,
          version INTEGER NOT NULL
        );
      `);

      const pool = pgmem.adapters.createPg();
      _pool = pool;
      _db = drizzle(pool);
    } else {
      // Use real postgres for production
      if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not set");
      }

      _pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      _db = drizzle(_pool);
    }

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
  await _pool?.end();
  _pool = null;
  _db = null;
}

export async function getServerVersion(db: ReturnType<typeof drizzle>): Promise<number> {
  const result = await db
    .select({ version: replicacheServerTable.version })
    .from(replicacheServerTable)
    .where(eq(replicacheServerTable.id, serverID))
    .limit(1);
  return result[0]?.version ?? 0;
}

export async function getLastMutationID(
  db: ReturnType<typeof drizzle>,
  clientID: string
): Promise<number> {
  const result = await db
    .select({ lastMutationID: replicacheClientTable.lastMutationID })
    .from(replicacheClientTable)
    .where(eq(replicacheClientTable.id, clientID))
    .limit(1);
  return result[0]?.lastMutationID ?? 0;
}

export async function getLastMutationIDChanges(
  db: ReturnType<typeof drizzle>,
  clientGroupID: string,
  fromVersion: number
): Promise<Record<string, number>> {
  const result = await db
    .select({ id: replicacheClientTable.id, lastMutationID: replicacheClientTable.lastMutationID })
    .from(replicacheClientTable)
    .where(
      and(
        eq(replicacheClientTable.clientGroupID, clientGroupID),
        gt(replicacheClientTable.version, fromVersion)
      )
    );
  return Object.fromEntries(result.map((r) => [r.id, r.lastMutationID]));
}

export async function setLastMutationID(
  db: ReturnType<typeof drizzle>,
  clientID: string,
  clientGroupID: string,
  mutationID: number,
  version: number
) {
  return db
    .insert(replicacheClientTable)
    .values({ id: clientID, clientGroupID, lastMutationID: mutationID, version })
    .onConflictDoUpdate({
      target: [replicacheClientTable.id],
      set: { clientGroupID, lastMutationID: mutationID, version },
    });
}

export async function setServerVersion(db: ReturnType<typeof drizzle>, version: number) {
  return db
    .insert(replicacheServerTable)
    .values({ id: serverID, version })
    .onConflictDoUpdate({
      target: [replicacheServerTable.id],
      set: { version },
    });
}
