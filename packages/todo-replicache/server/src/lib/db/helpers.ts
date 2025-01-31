import "dotenv/config";
import { BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import { replicacheClientTable, replicacheServerTable } from "./schema";
import { eq, gt, and } from "drizzle-orm";

let _db: BetterSQLite3Database | null = null;

export const serverID = 1;
export async function getDb(): Promise<BetterSQLite3Database> {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    _db = drizzle(process.env.DATABASE_URL);

    // Initialize server version in a transaction
    _db.transaction(async (tx) => {
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

export async function getServerVersion(db: BetterSQLite3Database): Promise<number> {
  const result = db
    .select({ version: replicacheServerTable.version })
    .from(replicacheServerTable)
    .where(eq(replicacheServerTable.id, serverID))
    .get();
  return result?.version ?? 0;
}

export async function getLastMutationID(
  db: BetterSQLite3Database,
  clientID: string
): Promise<number> {
  const result = db
    .select({ lastMutationID: replicacheClientTable.lastMutationID })
    .from(replicacheClientTable)
    .where(eq(replicacheClientTable.id, clientID))
    .get();
  return result?.lastMutationID ?? 0;
}

export async function getLastMutationIDChanges(
  db: BetterSQLite3Database,
  clientGroupID: string,
  fromVersion: number
): Promise<Record<string, number>> {
  const result = db
    .select({ id: replicacheClientTable.id, lastMutationID: replicacheClientTable.lastMutationID })
    .from(replicacheClientTable)
    .where(
      and(
        eq(replicacheClientTable.clientGroupID, clientGroupID),
        gt(replicacheClientTable.version, fromVersion)
      )
    )
    .all();
  return Object.fromEntries(result.map((r) => [r.id, r.lastMutationID]));
}

export async function setLastMutationID(
  db: BetterSQLite3Database,
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

export async function setServerVersion(db: BetterSQLite3Database, version: number) {
  return db
    .insert(replicacheServerTable)
    .values({ id: serverID, version })
    .onConflictDoUpdate({
      target: [replicacheServerTable.id],
      set: { version },
    });
}
