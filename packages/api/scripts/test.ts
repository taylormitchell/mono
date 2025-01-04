import "dotenv/config";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { replicacheServer } from "../src/db/schema";
import { serverID } from "../src/db";

async function main() {
  const _db = drizzle(process.env.DB_FILE_NAME);
  await _db.insert(replicacheServer).values({ id: serverID, version: 0 });
  console.log(_db.select().from(replicacheServer).get());
}

main();
