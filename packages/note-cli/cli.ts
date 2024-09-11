import { execSync } from "child_process";
import { Command } from "commander";
import path from "path";
import {
  listDir,
  createPost,
  createNote,
  getOrCreateDailyNote,
  openFile,
  getOrCreateWeeklyNote,
  getOrCreateMonthlyNote,
} from "@taylor/common/note";
import { getRootDir } from "@taylor/common/data";
import { readFileSync } from "fs";
import { addLogEntry, getTodayLogEvents } from "@taylor/common/logs/utils";
import {
  validateDuration,
  validateDatetime,
  LogEntry,
  parseDuration,
  formatDuration,
} from "@taylor/common/logs/types";
import { format } from "date-fns";

const program = new Command();

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
    if (p !== undefined && !path.isAbsolute(p)) {
      if (p.startsWith("@")) {
        p = path.join(getRootDir(), p.slice(1));
      } else {
        p = path.join(process.cwd(), p);
      }
    }
    p = createPost(p, options.message);
    if (!options.message) {
      openFile(p);
    }
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
    const path = getOrCreateDailyNote(date);
    if (shouldOpen) {
      execSync(`cursor ${path}`);
    }
  });

program
  .command("weekly [dateOrOffset]")
  .description("Open or create this week's note with optional date or offset from today")
  .action((dateOrOffset) => {
    const date = dateOrOffset ? parseDateOrOffset(dateOrOffset) : undefined;
    const path = getOrCreateWeeklyNote(date);
    execSync(`cursor ${path}`);
  });

program
  .command("monthly")
  .description("Open or create this month's note")
  .action(() => {
    const path = getOrCreateMonthlyNote();
    execSync(`cursor ${path}`);
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

const logCommand = program
  .command("log")
  .description("Add a log entry to log.jsonl")
  .option("-t, --type <type>", "Type of log entry");
const logTypes = ["meditated", "ankied", "eye-patch", "workout", "custom"];
logTypes.forEach((type) => {
  logCommand
    .command(type + " [duration]")
    .description(`Log a ${type} entry`)
    .option("-d, --datetime <datetime>", "Specify a custom datetime (default: current time)")
    .option("-t, --today", "Set the date to today (yyyy-mm-dd)")
    .option("-m, --message <message>", "Add an optional message to the log entry")
    .action(
      (
        duration: string | undefined,
        options: { datetime?: string; today?: boolean; message?: string }
      ) => {
        if (!validateDuration(duration) || !validateDatetime(options.datetime)) return;

        let datetime: string;
        if (options.datetime) {
          datetime = options.datetime;
        } else if (options.today) {
          datetime = new Date().toISOString().split("T")[0];
        } else {
          datetime = format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx");
        }

        const logEntry: LogEntry = {
          type,
          ...(duration && { duration }),
          datetime,
          ...(options.message && { message: options.message }),
        };

        addLogEntry(logEntry);
      }
    );
});

program
  .command("today")
  .description("Output today's daily note and summarize log events")
  .action(() => {
    // Output today's daily note
    const todayNote = getOrCreateDailyNote();
    console.log("Today's Daily Note:");
    console.log(readFileSync(todayNote, "utf-8"));

    // Summarize today's log events
    console.log("\nToday's Log Events Summary:");
    const logEvents = getTodayLogEvents();

    if (logEvents.length > 0) {
      const summary = logEvents.reduce((acc, event) => {
        if (!acc[event.type]) {
          acc[event.type] = { count: 0, totalDuration: 0, message: "" };
        }
        acc[event.type].count++;
        if (event.duration) {
          acc[event.type].totalDuration += parseDuration(event.duration);
        }
        if (event.message) {
          acc[event.type].message = event.message;
        }
        return acc;
      }, {});

      Object.entries(summary).forEach(([type, data]: [string, any]) => {
        let details = [data.totalDuration && formatDuration(data.totalDuration), data.message]
          .filter(Boolean)
          .join(" ");
        details = details ? `(${details})` : "";
        console.log(`${type}: ${data.count} ${details}`);
      });
    } else {
      console.log("No log events for today.");
    }
  });

program.parse(process.argv);
