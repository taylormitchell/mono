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
} from "./core";

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
    execSync(`cd ${__dirname} && git pull && git add --all && git commit -m "sync" && git push`);
  });

program.parse(process.argv);
