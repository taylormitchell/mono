import { drizzle } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";
import { replicacheServer } from "./db/schema";
import { getDb } from "./db";

export const serverID = 1;

export async function getServerVersion() {
  const db = await getDb();
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
