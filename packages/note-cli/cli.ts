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
  .option("--include-journals", "Include journal entries in the diff")
  .action((options) => {
    const rootDir = getRootDir();
    const excludeJournals = options.includeJournals
      ? ""
      : " ':(exclude)packages/notes/journals/**/*.md'";
    const command = `git -C "${rootDir}" log -p --since="${options.since}" -- '${rootDir}/**/*.md'${excludeJournals}`;
    try {
      const output = execSync(command, { encoding: "utf-8" });
      console.log(output);
    } catch (error) {
      console.error("Error executing git command:", error);
    }
  });

program.parse(process.argv);
