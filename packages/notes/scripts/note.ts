import { execSync } from "child_process";
import path from "path";
import fs from "fs";

const WEEK_DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// find root directory
// walk up the directory tree until we find a package.json
let d = 0;
let rootDir = __dirname;
while (!fs.existsSync(path.join(rootDir, "package.json"))) {
  rootDir = path.dirname(rootDir);
  d += 1;
  if (d > 10) {
    console.error("Could not find root directory");
    process.exit(1);
  }
}

function createOrOpenFile(filepath: string, content: string = "") {
  if (!fs.existsSync(filepath)) {
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    fs.writeFileSync(filepath, content);
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

function createPost(content?: string) {
  const filename = path.join(rootDir, "posts", `${getFormattedTimestamp()}.md`);
  createOrOpenFile(filename, content || "");
  if (!content) {
    execSync(`code ${filename}`);
  }
}

function createNote(name?: string) {
  const filename = name ? `${name}.md` : `${getFormattedTimestamp()}.md`;
  createOrOpenFile(path.join(rootDir, "notes", filename));
}

function listDir(directory: string) {
  const files = fs.readdirSync(directory);
  files.sort().forEach((file) => {
    console.log("---");
    console.log(file);
    console.log("");
    console.log(fs.readFileSync(path.join(directory, file), "utf-8"));
    console.log("");
  });
  console.log("---");
}

function openDailyNote(n = 0) {
  const date = new Date();
  date.setDate(date.getDate() + n);
  const month = date.toLocaleString("default", { month: "long" }).toLowerCase();
  const day = date.getDate();
  const filepath = path.join(rootDir, "journals", month, `${day}.md`);
  const absolutePath = createOrOpenFile(filepath, `# ${date.toDateString()}\n\n`);
  execSync(`code ${absolutePath}`);
}

function openWeeklyNote() {
  const today = new Date();
  const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1));
  const month = monday.toLocaleString("default", { month: "long" }).toLowerCase();
  const year = monday.getFullYear().toString();
  const day = monday.getDate();
  const filepath = path.join(rootDir, "journals", year, month, `week-of-${day}.md`);
  const absolutePath = createOrOpenFile(filepath);
  execSync(`code ${absolutePath}`);
}

function openMonthlyNote() {
  const today = new Date();
  const month = today.toLocaleString("default", { month: "long" }).toLowerCase();
  const year = today.getFullYear().toString();
  const filepath = path.join(rootDir, "journals", year, month, "index.md");
  const absolutePath = createOrOpenFile(filepath);
  execSync(`code ${absolutePath}`);
}

const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case "list":
    listDir(path.join(__dirname, args[0] || ""));
    break;
  case "post":
    createPost(args[0]);
    break;
  case "note":
    createNote(args[0]);
    break;
  case "daily":
    if (args[0]) {
      const i = WEEK_DAYS.indexOf(args[0].toLowerCase());
      if (i !== -1) {
        // Provided arg is string day of the week
        const n = (new Date().getDay() + i + 1) % 7;
        openDailyNote(n);
      } else {
        // Provided arg is number of days from today
        const n = parseInt(args[0]) || 0;
        openDailyNote(n);
      }
    } else {
      openDailyNote();
    }
    break;
  case "weekly":
    openWeeklyNote();
    break;
  case "monthly":
    openMonthlyNote();
    break;
  default:
    console.log("Usage: bun cli.ts <command> [content]");
    console.log("Commands:");
    console.log("  post [content]  Create a new post with optional content");
    console.log("  note [name]     Create a new note (optional name)");
    console.log("  daily [offset]  Open or create daily note (optional offset from today)");
    console.log("  weekly          Open or create this week's note");
}
