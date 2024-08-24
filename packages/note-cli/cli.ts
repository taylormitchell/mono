import { execSync } from "child_process";
import { Command } from "commander";
import path from "path";
import {
  getRootDir,
  listDir,
  createPost,
  createNote,
  openDailyNote,
  openWeeklyNote,
  openMonthlyNote,
} from "@taylor/common/note";

const WEEK_DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const program = new Command();

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
  .command("daily [offset]")
  .description("Open or create daily note with optional offset from today")
  .action((offset) => {
    if (offset) {
      const i = WEEK_DAYS.indexOf(offset.toLowerCase());
      if (i !== -1) {
        const n = (new Date().getDay() + i + 1) % 7;
        openDailyNote(n);
      } else {
        const n = parseInt(offset) || 0;
        openDailyNote(n);
      }
    } else {
      openDailyNote();
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
