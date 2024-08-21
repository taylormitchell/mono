import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import chalk from "chalk";
import { Command } from "commander";

const WEEK_DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function getRootDir() {
  let d = 0;
  let rootDir = __dirname;
  while (!fs.existsSync(path.join(rootDir, "package.json"))) {
    rootDir = path.dirname(rootDir);
    d += 1;
    if (d > 10) {
      throw new Error("Could not find root directory");
    }
  }
  return rootDir;
}

function getTemplateDir() {
  return path.join(getRootDir(), "templates");
}

function processTemplate(content: string): string {
  return content.replace(/\{\{>\s*(.+?)\}\}/g, (match, templateName) => {
    const fullPath = path.resolve(getTemplateDir(), templateName.trim(), ".md");
    if (fs.existsSync(fullPath)) {
      const templateContent = fs.readFileSync(fullPath, "utf-8");
      return processTemplate(templateContent);
    }
    return match; // Return original if template not found
  });
}

function createOrOpenFile(filepath: string, content: string = "") {
  if (!fs.existsSync(filepath)) {
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    const processedContent = processTemplate(content);
    fs.writeFileSync(filepath, processedContent);
  }
  return filepath;
}

function getFormattedTimestamp() {
  const now = new Date();
  const offset = -now.getTimezoneOffset();
  const offsetSign = offset >= 0 ? "+" : "-";
  const offsetHours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
  const offsetMinutes = String(Math.abs(offset) % 60).padStart(2, "0");

  return (
    now
      .toLocaleString("sv-SE", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })
      .replace(" ", "_")
      .replace(/:/g, "-") + `_${offsetSign}${offsetHours}${offsetMinutes}`
  );
}

function createPost(directory?: string, content?: string) {
  directory = directory || path.join(getRootDir(), "posts");
  const filename = path.join(directory, `${getFormattedTimestamp()}.md`);
  createOrOpenFile(filename, content || "");
  if (!content) {
    execSync(`cursor ${filename}`);
  }
}

function createNote(name?: string) {
  const filename = name ? `${name}.md` : `${getFormattedTimestamp()}.md`;
  createOrOpenFile(path.join(getRootDir(), "notes", filename));
}

function listDir(directory: string) {
  const files = fs.readdirSync(directory).sort().reverse();
  for (const file of files) {
    const content = fs.readFileSync(path.join(directory, file), "utf-8");
    if (content.length > 0) {
      console.log(chalk.green("file: " + file));
      console.log("");
      console.log(content);
      console.log("");
    }
  }
}

function openDailyNote(n = 0) {
  const date = new Date();
  date.setDate(date.getDate() + n);
  const month = date.toLocaleString("default", { month: "long" }).toLowerCase();
  const day = date.getDate();
  const year = date.getFullYear().toString();
  const filepath = path.join(getRootDir(), "journals", year, month, `${day}.md`);
  const templatePath = path.join(getRootDir(), "templates", "daily-note-template.md");
  const templateContent = fs.readFileSync(templatePath, "utf-8");
  const content = templateContent.replace("{{date}}", date.toDateString());
  const absolutePath = createOrOpenFile(filepath, content);
  execSync(`cursor ${absolutePath}`);
}

function openWeeklyNote() {
  const today = new Date();
  const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1));
  const month = monday.toLocaleString("default", { month: "long" }).toLowerCase();
  const year = monday.getFullYear().toString();
  const day = monday.getDate();
  const filepath = path.join(getRootDir(), "journals", year, month, `week-of-${day}.md`);
  const absolutePath = createOrOpenFile(filepath);
  execSync(`cursor ${absolutePath}`);
}

function openMonthlyNote() {
  const today = new Date();
  const month = today.toLocaleString("default", { month: "long" }).toLowerCase();
  const year = today.getFullYear().toString();
  const filepath = path.join(getRootDir(), "journals", year, month, "index.md");
  const absolutePath = createOrOpenFile(filepath);
  execSync(`cursor ${absolutePath}`);
}

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
