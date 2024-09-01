import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import chalk from "chalk";
import { getRootDir } from "./data";

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

export function getTemplatePath(name: string) {
  return path.resolve(getRootDir(), "templates", name + ".md");
}

export function processTemplate(content: string): string {
  return content
    .replace("{{date}}", new Date().toDateString())
    .replace(/([ \t]*)\{\{>\s*(.+?)\}\}/g, (match, whitespace, templateName) => {
      const fullPath = getTemplatePath(templateName.trim());
      if (fs.existsSync(fullPath)) {
        const templateContent = fs.readFileSync(fullPath, "utf-8");
        const processedContent = processTemplate(templateContent);
        return processedContent
          .split("\n")
          .map((line) => whitespace + line)
          .join("\n");
      }
      return match; // Return original if template not found
    });
}

export function createOrOpenFile(filepath: string, content: string = "") {
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

export function createPost(directory?: string, content?: string) {
  directory = directory || path.join(getRootDir(), "posts");
  const filename = path.join(directory, `${getFormattedTimestamp()}.md`);
  createOrOpenFile(filename, content || "");
  if (!content) {
    execSync(`cursor ${filename}`);
  }
}

export function createNote(name?: string) {
  const filename = name ? `${name}.md` : `${getFormattedTimestamp()}.md`;
  createOrOpenFile(path.join(getRootDir(), "notes", filename));
}

export function listDir(directory: string) {
  const files = fs.readdirSync(directory).sort().reverse();
  for (const file of files) {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);
    if (stats.isFile()) {
      const content = fs.readFileSync(filePath, "utf-8");
      if (content.length > 0) {
        console.log(chalk.green("file: " + file));
        console.log("");
        console.log(content);
        console.log("");
      }
    }
  }
}

export function dateToJournalPath(date: Date) {
  const dateString = date.toISOString().split("T")[0];
  const [year, month, day] = dateString.split("-");
  const monthNum = parseInt(month);
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    throw new Error("Invalid month number");
  }
  const monthName = MONTH_NAMES[monthNum - 1];
  return path.join(getRootDir(), "journals", year, monthName, `${day}.md`);
}

export function openDailyNote(dateOrOffset?: Date | number) {
  let date: Date;
  if (dateOrOffset instanceof Date) {
    date = dateOrOffset;
  } else if (typeof dateOrOffset === "number") {
    date = new Date();
    date.setDate(date.getDate() + dateOrOffset);
  } else {
    date = new Date();
  }
  const filepath = dateToJournalPath(date);
  const templatePath = path.join(getRootDir(), "templates", "daily-note-template.md");
  const templateContent = fs.readFileSync(templatePath, "utf-8");
  const content = templateContent.replace("{{date}}", date.toDateString());
  const absolutePath = createOrOpenFile(filepath, content);
  execSync(`cursor ${absolutePath}`);
}

export function openWeeklyNote() {
  const today = new Date();
  const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1));
  const month = monday.toLocaleString("default", { month: "long" }).toLowerCase();
  const year = monday.getFullYear().toString();
  const day = monday.getDate();
  const filepath = path.join(getRootDir(), "journals", year, month, `week-of-${day}.md`);
  const absolutePath = createOrOpenFile(filepath);
  execSync(`cursor ${absolutePath}`);
}

export function openMonthlyNote() {
  const today = new Date();
  const month = today.toLocaleString("default", { month: "long" }).toLowerCase();
  const year = today.getFullYear().toString();
  const filepath = path.join(getRootDir(), "journals", year, month, "index.md");
  const absolutePath = createOrOpenFile(filepath);
  execSync(`cursor ${absolutePath}`);
}
