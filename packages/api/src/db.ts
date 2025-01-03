import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";

export const serverID = 1;

let _db: Database | null = null;

export async function getDB() {
  if (!_db) {
    _db = await open({
      //   filename: path.join(getNotesDir(), "db.sqlite"),
      filename: ":memory:",
      driver: sqlite3.Database,
    });
    await initDB(_db);
  }
  return _db;
}

async function initDB(db: Database) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS replicache_server (
      id INTEGER PRIMARY KEY NOT NULL,
      version INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS todo (
      id TEXT PRIMARY KEY NOT NULL,
      content TEXT NOT NULL,
      due_date TEXT,
    );

    CREATE TABLE IF NOT EXISTS replicache_client (
      id VARCHAR(36) PRIMARY KEY NOT NULL,
      client_group_id VARCHAR(36) NOT NULL,
      last_mutation_id INTEGER NOT NULL,
      version INTEGER NOT NULL
    );
  `);

  // Initialize server version if not exists
  const server = await db.get("SELECT * FROM replicache_server WHERE id = ?", serverID);
  if (!server) {
    await db.run("INSERT INTO replicache_server (id, version) VALUES (?, 1)", serverID);
  }
}

export async function getServerVersion() {
  const db = await getDB();
  const res = await db.get("SELECT version FROM replicache_server WHERE id = ?", serverID);
  return res?.version;
}

export async function withTransaction<T>(cb: (db: Database) => Promise<T>): Promise<T> {
  const db = await getDB();
  await db.run("BEGIN TRANSACTION");
  try {
    const result = await cb(db);
    await db.run("COMMIT");
    return result;
  } catch (e) {
    await db.run("ROLLBACK");
    throw e;
  }
}
