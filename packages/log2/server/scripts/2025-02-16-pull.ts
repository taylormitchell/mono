import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { logTable } from "../src/lib/db/schema";
import "dotenv/config";
import { gte } from "drizzle-orm";
import * as fs from "fs";

async function main() {
  if (!process.env["DATABASE_URL"]) {
    throw new Error("DATABASE_URL is not set");
  }

  // Create a new pool and Drizzle instance
  const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
  const db = drizzle(pool);

  try {
    // Calculate date 7 days ago
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString();

    console.log("\n=== Pulling Logs from", oneWeekAgoStr, "===");

    // Query logs from the last week
    const logs = await db.select().from(logTable).where(gte(logTable.createdAt, oneWeekAgoStr));

    // Format the data for output
    const output = logs
      .filter((log) => log.data && log.deletedAt === null)
      .map((log) => ({
        id: log.id,
        createdAt: log.createdAt,
        text: log.text,
        data: log.data,
      }));

    // Write to file
    const outputPath = "./logs-export.json";
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`Exported ${logs.length} logs to ${outputPath}`);
  } catch (error) {
    console.error("Error pulling logs:", error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
