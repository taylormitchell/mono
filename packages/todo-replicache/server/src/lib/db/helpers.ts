import "dotenv/config";
import { LibSQLDatabase, drizzle } from "drizzle-orm/libsql";
import { replicacheClientTable, replicacheServerTable } from "./schema";
import { eq, gt, and } from "drizzle-orm";
let _db: LibSQLDatabase | null = null;

export const serverID = 1;
export async function getDb(): Promise<LibSQLDatabase> {
  if (!_db) {
    if (!process.env.DB_FILE_NAME) {
      throw new Error("DB_FILE_NAME is not set");
    }
    _db = drizzle(process.env.DB_FILE_NAME);

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

export async function getServerVersion(db: LibSQLDatabase): Promise<number> {
  const result = await db
    .select({ version: replicacheServerTable.version })
    .from(replicacheServerTable)
    .where(eq(replicacheServerTable.id, serverID))
    .get();
  return result?.version ?? 0;
}

export async function getLastMutationID(db: LibSQLDatabase, clientID: string): Promise<number> {
  const result = await db
    .select({ lastMutationID: replicacheClientTable.lastMutationID })
    .from(replicacheClientTable)
    .where(eq(replicacheClientTable.id, clientID))
    .get();
  return result?.lastMutationID ?? 0;
}

export async function getLastMutationIDChanges(
  db: LibSQLDatabase,
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
    )
    .all();
  return Object.fromEntries(result.map((r) => [r.id, r.lastMutationID]));
}

export async function setLastMutationID(
  db: LibSQLDatabase,
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

export async function setServerVersion(db: LibSQLDatabase, version: number) {
  return await db
    .insert(replicacheServerTable)
    .values({ id: serverID, version })
    .onConflictDoUpdate({
      target: [replicacheServerTable.id],
      set: { version },
    });
}
