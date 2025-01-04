import "dotenv/config";
import { BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";

let _db: BunSQLiteDatabase | null = null;

export function getDb() {
  if (!_db) {
    if (!process.env.DB_FILE_NAME) {
      throw new Error("DB_FILE_NAME is not set");
    }
    _db = drizzle(process.env.DB_FILE_NAME);
  }
  return _db;
}

export async function resetDb() {
  _db = null;
}
