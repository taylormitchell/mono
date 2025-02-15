import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { logTable } from "../src/lib/db/schema";
import "dotenv/config";
import { eq } from "drizzle-orm";

async function main() {
  if (!process.env["DATABASE_URL"]) {
    throw new Error("DATABASE_URL is not set");
  }

  // Create a new pool and Drizzle instance
  const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
  const db = drizzle(pool);

  try {
    console.log("\n=== Processing Logs ===");
    const logs = await db.select().from(logTable);

    for (const log of logs) {
      const dataArray = log.data as any[];
      let hasUpdates = false;

      const updatedDataArray = dataArray.map((data) => {
        if (!data.startedAt) return data;

        let newStartedAt: string;

        if (data.startedAt.endsWith("Z") || data.startedAt.endsWith("-05:00")) {
          // All the timestamps are actually in UTC. Update suffix to Z to parse correctly.
          const date = new Date(data.startedAt.replace("-05:00", "Z"));
          // Subtract 5 hours and format to EST
          date.setHours(date.getHours() - 5);
          newStartedAt = date
            .toISOString()
            .replace("Z", "-05:00")
            .replace(/\.\d{3}/, "");
          hasUpdates = true;
        } else {
          return data;
        }

        console.log("Processing log", log.id, data.startedAt, "->", newStartedAt);
        return { ...data, startedAt: newStartedAt };
      });

      if (hasUpdates) {
        await db.update(logTable).set({ data: updatedDataArray }).where(eq(logTable.id, log.id));
        console.log(`Updated log ${log.id} in db`);
      }
    }
  } catch (error) {
    console.error("Error updating database:", error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

main().catch(console.error);

// Results:
// === Processing Logs ===
// Processing log 01JM1795B8CR8VAG0EXKNZZQWP 2025-02-14T03:15:41-05:00 -> 2025-02-13T22:15:41-05:00
// Updated log 01JM1795B8CR8VAG0EXKNZZQWP in db
// Processing log 01JM14KS3QBVE4ZMBZJWTJ3V4G 2025-02-14T02:29:06-05:00 -> 2025-02-13T21:29:06-05:00
// Updated log 01JM14KS3QBVE4ZMBZJWTJ3V4G in db
// Processing log 01JM12AEFFC9B2Q33YDXQPQZK7 2025-02-13T23:48:32-05:00 -> 2025-02-13T18:48:32-05:00
// Updated log 01JM12AEFFC9B2Q33YDXQPQZK7 in db
// Processing log 01JKZTBF7A240FFJ5F7K8X0T11 2025-02-12T12:30:00-05:00 -> 2025-02-12T07:30:00-05:00
// Updated log 01JKZTBF7A240FFJ5F7K8X0T11 in db
// Processing log 01JM15636T586W3SPBTK9Z5YQ1 2025-02-14T02:39:08-05:00 -> 2025-02-13T21:39:08-05:00
// Updated log 01JM15636T586W3SPBTK9Z5YQ1 in db
// Processing log 01JM16N2QTP2J77M768184WBN5 2025-02-14T03:04:47-05:00 -> 2025-02-13T22:04:47-05:00
// Updated log 01JM16N2QTP2J77M768184WBN5 in db
// Processing log 01JM30CM5ZE552CZTAP8R9M3JW 2025-02-14T19:53:52.063Z -> 2025-02-14T14:53:52-05:00
// Updated log 01JM30CM5ZE552CZTAP8R9M3JW in db
// Processing log 01JM2ZYKZKP4ZWE4A02HCV70ZD 2025-02-14T19:46:13.107Z -> 2025-02-14T14:46:13-05:00
// Updated log 01JM2ZYKZKP4ZWE4A02HCV70ZD in db
// Processing log 01JM2ZZV3NCTJ4DSKQH2DMQ8JM 2025-02-14T19:46:53.173Z -> 2025-02-14T14:46:53-05:00
// Updated log 01JM2ZZV3NCTJ4DSKQH2DMQ8JM in db
// Processing log 01JM304XGF17CG4Y4B93EM0X9V 2025-02-14T19:49:39.471Z -> 2025-02-14T14:49:39-05:00
// Updated log 01JM304XGF17CG4Y4B93EM0X9V in db
// Processing log 01JM30CAKQ86EXK8C63X28G051 2025-02-14T19:53:42.263Z -> 2025-02-14T14:53:42-05:00
// Updated log 01JM30CAKQ86EXK8C63X28G051 in db
// Processing log 01JM304Q8JEY8493EEK68K4S7E 2025-02-14T19:49:33.074Z -> 2025-02-14T14:49:33-05:00
// Updated log 01JM304Q8JEY8493EEK68K4S7E in db
// Processing log 01JM15Z62Y1PMWE23QVE8QPS1Y 2025-02-14T02:52:20-05:00 -> 2025-02-13T21:52:20-05:00
// Updated log 01JM15Z62Y1PMWE23QVE8QPS1Y in db
// Processing log 01JM30DJ48S8KXNP184E5B70JW 2025-02-14T19:54:22.728Z -> 2025-02-14T14:54:22-05:00
// Updated log 01JM30DJ48S8KXNP184E5B70JW in db
// Processing log 01JM2CTWX8TBXB1NHD4BV9R3KA 2025-02-14T14:12:01-05:00 -> 2025-02-14T09:12:01-05:00
// Updated log 01JM2CTWX8TBXB1NHD4BV9R3KA in db
// Processing log 01JM31SWXZJ8PS485GB7MGZ84Y 2025-02-14T20:18:35.583Z -> 2025-02-14T15:18:35-05:00
// Updated log 01JM31SWXZJ8PS485GB7MGZ84Y in db
// Processing log 01JM31FN8K9Y88ZKAJ32HAAJ5X 2025-02-14T20:13:00.051Z -> 2025-02-14T15:13:00-05:00
// Updated log 01JM31FN8K9Y88ZKAJ32HAAJ5X in db
// Processing log 01JM31SPK5Q6N76KVB5XFQVJJB 2025-02-14T20:18:29.093Z -> 2025-02-14T15:18:29-05:00
// Updated log 01JM31SPK5Q6N76KVB5XFQVJJB in db
// Processing log 01JM2K7HFWZVCAPJFR75VCE0HS 2025-02-14T16:03:48-05:00 -> 2025-02-14T11:03:48-05:00
// Updated log 01JM2K7HFWZVCAPJFR75VCE0HS in db
// Processing log 01JM2M1P2M8BAD8EJ4XFM7NH2Y 2025-02-14T16:18:03-05:00 -> 2025-02-14T11:18:03-05:00
// Updated log 01JM2M1P2M8BAD8EJ4XFM7NH2Y in db
// Processing log 01JM2VK0XF7Y22PK1M9DJBZPXQ 2025-02-14T18:29:54-05:00 -> 2025-02-14T13:29:54-05:00
// Processing log 01JM2VK0XF7Y22PK1M9DJBZPXQ 2025-02-14T18:29:54-05:00 -> 2025-02-14T13:29:54-05:00
// Updated log 01JM2VK0XF7Y22PK1M9DJBZPXQ in db
// Processing log 01JM15H2KKNPDTADS9Y81AZKHP 2025-02-14T02:44:34-05:00 -> 2025-02-13T21:44:34-05:00
// Updated log 01JM15H2KKNPDTADS9Y81AZKHP in db
// Processing log 01JM31SJ67DGD38TM4QNGJJF5S 2025-02-14T20:18:24.583Z -> 2025-02-14T15:18:24-05:00
// Updated log 01JM31SJ67DGD38TM4QNGJJF5S in db
// Processing log 01JM31Z14YCT9VJTXQ09FHY1GJ 2025-02-14T20:21:23.742Z -> 2025-02-14T15:21:23-05:00
// Updated log 01JM31Z14YCT9VJTXQ09FHY1GJ in db
// Processing log 01JM31XF8N26B33HPYNS90N6C6 2025-02-14T20:20:32.661Z -> 2025-02-14T15:20:32-05:00
// Updated log 01JM31XF8N26B33HPYNS90N6C6 in db
// Processing log 01JM31WMCRPQ9XX0KNZ1WP9WR5 2025-02-14T20:20:05.144Z -> 2025-02-14T15:20:05-05:00
// Updated log 01JM31WMCRPQ9XX0KNZ1WP9WR5 in db
// Processing log 01JM32J9GG7Z5AV6Y69APGBTWW 2025-02-14T20:31:54.896Z -> 2025-02-14T15:31:54-05:00
// Updated log 01JM32J9GG7Z5AV6Y69APGBTWW in db
// Processing log 01JM31DYP291ZJG2C3795SZQ16 2025-02-14T20:12:04.162Z -> 2025-02-14T15:12:04-05:00
// Updated log 01JM31DYP291ZJG2C3795SZQ16 in db
// Processing log 01JM355X91B7XVM1F749ZGT8E7 2025-02-14T21:17:34.881Z -> 2025-02-14T16:17:34-05:00
// Updated log 01JM355X91B7XVM1F749ZGT8E7 in db
// Processing log 01JM3STBKXK0YF1VEF6W74J4EC 2025-02-15T03:18:16.445Z -> 2025-02-14T22:18:16-05:00
// Updated log 01JM3STBKXK0YF1VEF6W74J4EC in db
// Processing log 01JM4VJYCEB787EK1HWYXYAVJK 2025-02-15T00:00:00Z -> 2025-02-14T19:00:00-05:00
// Processing log 01JM4VJYCEB787EK1HWYXYAVJK 2025-02-15T00:00:00Z -> 2025-02-14T19:00:00-05:00
// Processing log 01JM4VJYCEB787EK1HWYXYAVJK 2025-02-15T00:00:00Z -> 2025-02-14T19:00:00-05:00
// Processing log 01JM4VJYCEB787EK1HWYXYAVJK 2025-02-15T00:00:00Z -> 2025-02-14T19:00:00-05:00
// Processing log 01JM4VJYCEB787EK1HWYXYAVJK 2025-02-15T00:00:00Z -> 2025-02-14T19:00:00-05:00
// Updated log 01JM4VJYCEB787EK1HWYXYAVJK in db
// Processing log 01JM4W7AFN79Y74ZJ00E52QQCZ 2025-02-15T13:19:32.852Z -> 2025-02-15T08:19:32-05:00
// Updated log 01JM4W7AFN79Y74ZJ00E52QQCZ in db
// Processing log 01JM2K2S67W0KR6NGR4WAB07RW 2025-02-14T15:30:53-05:00 -> 2025-02-14T10:30:53-05:00
// Processing log 01JM2K2S67W0KR6NGR4WAB07RW 2025-02-14T15:30:53-05:00 -> 2025-02-14T10:30:53-05:00
// Processing log 01JM2K2S67W0KR6NGR4WAB07RW 2025-02-14T15:30:53-05:00 -> 2025-02-14T10:30:53-05:00
// Updated log 01JM2K2S67W0KR6NGR4WAB07RW in db
