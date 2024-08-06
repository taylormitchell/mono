import { execSync } from "child_process";
import path from "path";
import fs from "fs";

function ensureDirectoryExists(directory: string) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    console.log(`Created directory: ${directory}`);
  }
}

function createFile(filepath: string) {
  const directory = path.dirname(filepath);
  ensureDirectoryExists(directory);
  fs.writeFileSync(filepath, ""); // Create an empty file
  execSync(`code ${filepath}`);
  console.log(`Created file: ${filepath}`);
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

function createPost() {
  const filename = path.join("posts", `${getFormattedTimestamp()}.md`);
  createFile(filename);
}

function createNote(name?: string) {
  const filename = name ? `${name}.md` : `${getFormattedTimestamp()}.md`;
  createFile(filename);
}

const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case "post":
    createPost();
    break;
  case "note":
    createNote(arg);
    break;
  default:
    console.log("Usage: ts-node cli.ts <command> [arg]");
    console.log("Commands:");
    console.log("  post            Create a new post");
    console.log("  note [name]     Create a new note (optional name)");
}
