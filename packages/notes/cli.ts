import { execSync } from "child_process";
import path from "path";
import fs from "fs";

function ensureDirectoryExists(directory: string) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function createFile(filepath: string, content: string = "") {
  const absolutePath = path.join(__dirname, filepath);
  const directory = path.dirname(absolutePath);
  ensureDirectoryExists(directory);
  fs.writeFileSync(absolutePath, content);
  return absolutePath;
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
  const filename = path.join("posts", `${getFormattedTimestamp()}.md`);
  createFile(filename, content || "");
  if (!content) {
    execSync(`code ${filename}`);
  }
}

function createNote(name?: string) {
  const filename = name ? `${name}.md` : `${getFormattedTimestamp()}.md`;
  createFile(filename);
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

function openDailyNote() {
  const today = new Date();
  const month = today.toLocaleString("default", { month: "long" }).toLowerCase();
  const day = today.getDate();
  const filepath = path.join("journals", month, `${day}.md`);
  const absolutePath = createFile(filepath);
  execSync(`code ${absolutePath}`);
}

function openWeeklyNote() {
  const today = new Date();
  const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1));
  const month = monday.toLocaleString("default", { month: "long" }).toLowerCase();
  const year = monday.getFullYear().toString();
  const day = monday.getDate();
  const filepath = path.join("journals", year, month, `week-of-${day}.md`);
  const absolutePath = createFile(filepath);
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
    openDailyNote();
    break;
  case "weekly":
    openWeeklyNote();
    break;
  default:
    console.log("Usage: bun cli.ts <command> [content]");
    console.log("Commands:");
    console.log("  post [content]  Create a new post with optional content");
    console.log("  note [name]     Create a new note (optional name)");
    console.log("  daily           Open or create today's daily note");
    console.log("  weekly          Open or create this week's note");
}
