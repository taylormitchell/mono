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
  const byDate: Record<string, string[]> = {};
  files.sort().forEach((file) => {
    const date = file.slice(0, 10);
    if (!byDate[date]) {
      byDate[date] = [];
    }
    byDate[date].push(file);
  });
  Object.entries(byDate).forEach(([date, files]) => {
    console.log("# " + date);
    files.forEach((file) => {
      console.log("---");
      console.log(fs.readFileSync(path.join(directory, file), "utf-8"));
    });
    console.log("---");
  });
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
  default:
    console.log("Usage: bun cli.ts <command> [content]");
    console.log("Commands:");
    console.log("  post [content]  Create a new post with optional content");
    console.log("  note [name]     Create a new note (optional name)");
}
