import { execSync } from "child_process";
import { Command } from "commander";
import path from "path";
import {
  listDir,
  createPost,
  createNote,
  openDailyNote,
  openWeeklyNote,
  openMonthlyNote,
  createDailyNote,
} from "@taylor/common/note";
import { getRootDir } from "@taylor/common/data";
import fs from "fs";
import { readFileSync } from "fs";

const WEEK_DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const program = new Command();

function parseDateOrOffset(dateOrOffset: string): Date | number {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOrOffset)) {
    const [year, month, day] = dateOrOffset.split("-").map(Number);
    return new Date(year, month - 1, day);
  } else if (!isNaN(parseInt(dateOrOffset))) {
    return parseInt(dateOrOffset);
  } else {
    throw new Error("Invalid input: must be a date in YYYY-MM-DD format or a number");
  }
}

program
  .command("list [dir]")
  .description("List directory contents")
  .action((dir) => {
    listDir(path.join(getRootDir(), dir || ""));
  });

program
  .command("post [path]")
  .option("-m, --message <content>", "content of the post")
  .description("Create a new post with optional content")
  .action((p: string | undefined, options: Partial<{ message: string }>) => {
    if (p !== undefined) {
      p = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
    }
    createPost(p, options.message);
  });

program
  .command("note [name]")
  .description("Create a new note with optional name")
  .action((name) => {
    createNote(name);
  });

program
  .command("daily [dateOrOffset]")
  .description("Open or create daily note with optional date or offset from today")
  .option("-n, --no-open", "Create the note without opening it")
  .action((dateOrOffset, options) => {
    const shouldOpen = options.open !== false;
    const date = dateOrOffset ? parseDateOrOffset(dateOrOffset) : undefined;
    createDailyNote(date);
    if (shouldOpen) {
      openDailyNote(date);
    }
  });

program
  .command("weekly")
  .description("Open or create this week's note")
  .action(() => {
    openWeeklyNote();
  });

program
  .command("monthly")
  .description("Open or create this month's note")
  .action(() => {
    openMonthlyNote();
  });

program
  .command("sync")
  .description("Commit and push all changes")
  .action(() => {
    execSync(
      `cd ${__dirname} && git add --all && git commit -m "sync" && git pull --rebase && git push`
    );
  });

program
  .command("diffs")
  .description("Show diffs of recent changes in notes")
  .option("--since <time>", "Time range for diffs (e.g., '2 days ago')", "1 week ago")
  .option("--include-journals", "Include daily journal entries in the diff")
  .action((options) => {
    const rootDir = getRootDir();
    const excludeJournals = options.includeJournals ? "" : " ':(exclude)journals/**/*.md'";
    const command = `git -C "${rootDir}" log -p --since="${options.since}" -- '${rootDir}/**/*.md'${excludeJournals}`;
    try {
      const output = execSync(command, { encoding: "utf-8" });
      console.log(output);
    } catch (error) {
      console.error("Error executing git command:", error);
    }
  });

function validateDuration(duration: string | undefined): boolean {
  if (duration && !/^\d+[hms]$/.test(duration)) {
    console.error(
      "Invalid duration format. Use a number followed by 'h' (hours), 'm' (minutes), or 's' (seconds)."
    );
    return false;
  }
  return true;
}

function validateDatetime(datetime: string | undefined): boolean {
  if (datetime && isNaN(Date.parse(datetime))) {
    console.error(
      "Invalid datetime format. Use ISO 8601 format (e.g., '2023-04-15T14:30:00-04:00')"
    );
    return false;
  }
  return true;
}

function addLogEntry(logEntry: any) {
  const logPath = path.join(getRootDir(), "log.jsonl");
  const logLine = JSON.stringify(logEntry) + "\n";
  fs.appendFileSync(logPath, logLine);
  console.log(`Log entry added: ${logLine.trim()}`);
}

const logCommand = program.command("log").description("Add a log entry to log.jsonl");
const logTypes = ["meditated", "ankied", "eye-patch"];
logTypes.forEach((type) => {
  logCommand
    .command(type + " [duration]")
    .description(`Log a ${type} entry`)
    .option("-d, --datetime <datetime>", "Specify a custom datetime (default: current time)")
    .action((duration: string | undefined, options: { datetime?: string }) => {
      if (!validateDuration(duration) || !validateDatetime(options.datetime)) return;

      const logEntry = {
        type,
        ...(duration && { duration }),
        datetime: options.datetime || new Date().toISOString(),
      };

      addLogEntry(logEntry);
    });
});

// Add new sub-command for custom log types
logCommand
  .command("custom <type> [duration]")
  .description("Log a custom entry type")
  .option("-d, --datetime <datetime>", "Specify a custom datetime (default: current time)")
  .option("-m, --message <message>", "Add an optional message to the log entry")
  .action(
    (
      type: string,
      duration: string | undefined,
      options: { datetime?: string; message?: string }
    ) => {
      if (!validateDuration(duration) || !validateDatetime(options.datetime)) return;

      const logEntry = {
        type,
        ...(duration && { duration }),
        datetime: options.datetime || new Date().toISOString(),
        ...(options.message && { message: options.message }),
      };

      addLogEntry(logEntry);
    }
  );

program
  .command("today")
  .description("Output today's daily note and summarize log events")
  .action(() => {
    // Output today's daily note
    const todayNote = createDailyNote();
    console.log("Today's Daily Note:");
    console.log(readFileSync(todayNote, "utf-8"));

    // Summarize today's log events
    const logPath = path.join(getRootDir(), "log.jsonl");
    const today = new Date().toISOString().split("T")[0];
    console.log("\nToday's Log Events Summary:");
    const logEvents = readFileSync(logPath, "utf-8")
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line))
      .filter((entry) => entry.datetime.startsWith(today));

    if (logEvents.length > 0) {
      const summary = logEvents.reduce((acc, event) => {
        if (!acc[event.type]) {
          acc[event.type] = { count: 0, totalDuration: 0 };
        }
        acc[event.type].count++;
        if (event.duration) {
          acc[event.type].totalDuration += parseDuration(event.duration);
        }
        return acc;
      }, {});

      Object.entries(summary).forEach(([type, data]: [string, any]) => {
        console.log(
          `${type}: ${data.count} ${
            data.totalDuration ? `(${formatDuration(data.totalDuration)})` : ""
          }`
        );
      });
    } else {
      console.log("No log events for today.");
    }
  });

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([hms])$/);
  if (!match) return 0;
  const [, value, unit] = match;
  switch (unit) {
    case "h":
      return parseInt(value) * 60 * 60;
    case "m":
      return parseInt(value) * 60;
    case "s":
      return parseInt(value);
    default:
      return 0;
  }
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0) parts.push(`${remainingSeconds}s`);
  return parts.join(" ");
}

program.parse(process.argv);
