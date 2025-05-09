import { Command } from "commander";
import { z } from "zod";
import chalk from "chalk";
import path from "node:path";
import fs from "node:fs";
import { toTimestampWithTimezone, ensureDir, getFormattedDate } from "../../lib/utils";
import { getConfig } from "../../lib/config";
import { an } from "../../lib/an";

/**
 * Creates a journal note (daily, weekly, monthly)
 */
function getOrCreateJournalNote({
  type,
  date,
  offset,
  notesDir,
}: {
  type: "daily" | "weekly" | "monthly";
  date?: Date;
  offset?: number;
  notesDir: string;
}): string {
  let targetDate: Date;

  if (date instanceof Date) {
    targetDate = date;
  } else if (typeof offset === "number") {
    targetDate = new Date();
    if (type === "daily") {
      targetDate.setDate(targetDate.getDate() + offset);
    } else if (type === "weekly") {
      targetDate.setDate(targetDate.getDate() + offset * 7);
    } else if (type === "monthly") {
      targetDate.setMonth(targetDate.getMonth() + offset);
    }
  } else {
    targetDate = new Date();
  }

  let filepath: string;
  let templateContent = "# {{date}}\n\n";

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  const day = String(targetDate.getDate()).padStart(2, "0");
  
  switch (type) {
    case "daily":
      filepath = path.join(notesDir, `${year}-${month}-${day}.md`);
      templateContent = templateContent.replace("{{date}}", targetDate.toDateString());
      break;
    case "weekly":
      const monday = new Date(
        targetDate.setDate(targetDate.getDate() - targetDate.getDay() + 1)
      ).getDate();
      filepath = path.join(notesDir, `${year}-${month}-week-of-${monday}.md`);
      templateContent = templateContent.replace("{{date}}", "Week of " + targetDate.toDateString());
      break;
    case "monthly":
      filepath = path.join(notesDir, `${year}-${month}.md`);
      const monthName = targetDate.toLocaleString("default", { month: "long" });
      const yearStr = targetDate.getFullYear().toString();
      templateContent = templateContent.replace("{{date}}", `${monthName} ${yearStr}`);
      break;
  }

  // Create the file if it doesn't exist
  if (!fs.existsSync(filepath)) {
    ensureDir(path.dirname(filepath));
    fs.writeFileSync(filepath, templateContent);
  }

  return filepath;
}

function getOrCreateDailyNote(dateOrOffset: Date | number | undefined, notesDir: string): string {
  return getOrCreateJournalNote({
    type: "daily",
    date: dateOrOffset instanceof Date ? dateOrOffset : undefined,
    offset: typeof dateOrOffset === "number" ? dateOrOffset : undefined,
    notesDir,
  });
}

function getOrCreateWeeklyNote(dateOrOffset: Date | number | undefined, notesDir: string): string {
  return getOrCreateJournalNote({
    type: "weekly",
    date: dateOrOffset instanceof Date ? dateOrOffset : undefined,
    offset: typeof dateOrOffset === "number" ? dateOrOffset : undefined,
    notesDir,
  });
}

function getOrCreateMonthlyNote(notesDir: string): string {
  return getOrCreateJournalNote({
    type: "monthly",
    notesDir,
  });
}

/**
 * Parse date string or offset
 */
function parseDateOrOffset(dateOrOffset: string): Date | number {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOrOffset)) {
    const [year, month, day] = dateOrOffset.split("-").map(Number);
    return new Date(year, month - 1, day);
  } else if (!isNaN(parseInt(dateOrOffset))) {
    return parseInt(dateOrOffset);
  } else {
    throw new Error(
      `Invalid input: must be a date in YYYY-MM-DD format or a number. Received: ${dateOrOffset}`
    );
  }
}

export const noteCommand = new Command("note")
  .description("Create a new note")
  .argument("[name]", "Name of the note file (optional)")
  .option("-m, --message <message>", "Initial content of the note")
  .option("-o, --offset <offset>", "Offset from today's date")
  .action(
    an(
      z.tuple([
        z.string().optional(),
        z.object({
          message: z.string().optional(),
          offset: z.string().default("0").transform(Number),
        }),
      ]),
      (name, options) => {
        try {
          const config = getConfig();
          const notesDir = config.notesDir;

          if (!notesDir) {
            console.error(chalk.red("Notes directory not found in config"));
            process.exit(1);
          }

          // Create notes directory if it doesn't exist
          ensureDir(notesDir);

          let filePath: string;
          
          // Handle special cases
          if (name === "daily") {
            filePath = getOrCreateDailyNote(options.offset, notesDir);
          } else if (name === "weekly") {
            filePath = getOrCreateWeeklyNote(options.offset, notesDir);
          } else if (name === "monthly") {
            filePath = getOrCreateMonthlyNote(notesDir);
          } else if (!name) {
            // Default: timestamp format
            const noteFilename = `${toTimestampWithTimezone(new Date())}.md`;
            filePath = path.join(notesDir, noteFilename);
            
            // Write the file with the provided message or empty content
            fs.writeFileSync(filePath, options.message || "");
          } else {
            // User provided name
            const noteFilename = name.endsWith(".md") ? name : `${name}.md`;
            filePath = path.join(notesDir, noteFilename);
            
            // Write the file with the provided message or empty content
            fs.writeFileSync(filePath, options.message || "");
          }

          // Output the file path and whether to open it for the shell wrapper to use
          const shouldOpen = options.message === undefined;
          console.log(`${filePath}:${shouldOpen}`);
        } catch (error) {
          console.error(
            chalk.red(
              `Error creating note: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      }
    )
  );
