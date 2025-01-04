import { getDb } from "../src/db";
import { replicacheServer } from "../src/db/schema";

const db = getDb();
console.log(db.select().from(replicacheServer).get());
