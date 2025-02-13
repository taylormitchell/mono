import "dotenv/config";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";

import { Pool } from "pg";
import { replicacheClientTable, replicacheServerTable } from "./schema";
import { eq, gt, and } from "drizzle-orm";

let _db: NodePgDatabase | null = null;
let _pool: Pool | null = null;

export const serverID = 1;
export async function getDb() {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
    _db = drizzle(_pool);

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

export async function getServerVersion(db: NodePgDatabase): Promise<number> {
  const result = await db
    .select({ version: replicacheServerTable.version })
    .from(replicacheServerTable)
    .where(eq(replicacheServerTable.id, serverID))
    .limit(1);
  return result[0]?.version ?? 0;
}

export async function getLastMutationID(db: NodePgDatabase, clientID: string): Promise<number> {
  const result = await db
    .select({ lastMutationID: replicacheClientTable.lastMutationID })
    .from(replicacheClientTable)
    .where(eq(replicacheClientTable.id, clientID))
    .limit(1);
  return result[0]?.lastMutationID ?? 0;
}

export async function getLastMutationIDChanges(
  db: NodePgDatabase,
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
  db: NodePgDatabase,
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

export async function setServerVersion(db: NodePgDatabase, version: number) {
  return db
    .insert(replicacheServerTable)
    .values({ id: serverID, version })
    .onConflictDoUpdate({
      target: [replicacheServerTable.id],
      set: { version },
    });
}
