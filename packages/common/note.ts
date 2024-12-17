import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import chalk from "chalk";
import { getNotesDir } from "./data";
import { format } from "date-fns";

export function getTemplatePath(name: string) {
  return path.resolve(getNotesDir(), "templates", name + ".md");
}

function replaceTemplate(props: TemplateProps) {
  const { name, doc, start } = props;
  const contentBeforeTemplate = doc.slice(0, start);
  const lastNewlineIndex = contentBeforeTemplate.lastIndexOf("\n");
  const whitespace =
    lastNewlineIndex === -1
      ? contentBeforeTemplate.slice(0)
      : contentBeforeTemplate.slice(lastNewlineIndex + 1);
  const fullPath = getTemplatePath(name.trim());
  if (fs.existsSync(fullPath)) {
    const templateContent = fs.readFileSync(fullPath, "utf-8");
    const processedContent = processTemplate(templateContent);
    return processedContent
      .split("\n")
      .map((line, i) => (i === 0 ? line : whitespace + line))
      .join("\n");
  }
  return name;
}

type TemplateProps = {
  start: number;
  end: number;
  name: string;
  doc: string;
};

export function processTemplate(content: string): string {
  const view = {
    date: new Date().toDateString(),
    "morning-routine": (props: TemplateProps) => replaceTemplate(props),
    "start-of-workday-routine": (props: TemplateProps) => replaceTemplate(props),
    "end-of-workday-routine": (props: TemplateProps) => replaceTemplate(props),
    "inbox-list": (props: TemplateProps) => replaceTemplate(props),
    "sketch-out-my-day": (props: TemplateProps) => replaceTemplate(props),
    "weekly-planning": (props: TemplateProps) => {
      const today = new Date();
      if (today.getDay() === 1) {
        return "- [ ] do weekly planning";
      }
      return "";
    },
  };
  return content.replace(/{{([^{}]+)}}/g, (match, templateName, offset, doc) => {
    const handler = view[templateName.trim() as keyof typeof view];
    if (handler === undefined) {
      return match;
    } else if (typeof handler === "function") {
      return handler({
        name: templateName.trim(),
        doc,
        start: offset,
        end: offset + match.length,
      });
    } else {
      return handler;
    }
  });
}

export function createFile(filepath: string, content: string = "") {
  if (!fs.existsSync(filepath)) {
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    const processedContent = processTemplate(content);
    fs.writeFileSync(filepath, processedContent);
  }
  return filepath;
}

export function openFile(filepath: string) {
  execSync(`cursor ${filepath}`);
  // open in obsidian
  // const file = filepath.replace(getNotesDir(), "").replace(/\\/g, "/");
  // execSync(`open -n "obsidian://open?vault=data&file=${file}"`);
}

function postFileFormat(date: string | number | Date) {
  return format(date, "yyyy-MM-dd_HH-mm-ss_xx") + ".md";
}

export function createPost(directory?: string, content?: string): string {
  directory = directory || getNotesDir();
  const filepath = path.join(directory, postFileFormat(new Date()));
  createFile(filepath, content || "");
  return filepath;
}

export function createNote(name?: string): string {
  const filename = name ? `${name}.md` : postFileFormat(new Date());
  const filepath = path.join(getNotesDir(), filename);
  return createFile(filepath);
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

export function getOrCreateJournalNote({
  type,
  date,
  offset,
}: {
  type: "daily" | "weekly" | "monthly";
  date?: Date;
  offset?: number;
}): string {
  let targetDate: Date;

  if (date instanceof Date) {
    targetDate = date;
  } else if (typeof offset === "number") {
    targetDate = new Date();
    if (type === "daily") {
      targetDate.setDate(targetDate.getDate() + offset);
    } else if (type === "weekly") {
      targetDate.setDate(targetDate.getDate() + offset * 7);
    } else if (type === "monthly") {
      targetDate.setMonth(targetDate.getMonth() + offset);
    }
  } else {
    targetDate = new Date();
  }

  let filepath: string;
  let templatePath: string;

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  const day = String(targetDate.getDate()).padStart(2, "0");
  switch (type) {
    case "daily":
      filepath = path.join(getNotesDir(), `${year}-${month}-${day}.md`);
      templatePath =
        targetDate.getDay() > 0 && targetDate.getDay() < 6
          ? path.join(getNotesDir(), "weekday-note-template.md")
          : path.join(getNotesDir(), "weekend-note-template.md");
      break;
    case "weekly":
      const monday = new Date(
        targetDate.setDate(targetDate.getDate() - targetDate.getDay() + 1)
      ).getDate();
      filepath = path.join(getNotesDir(), `${year}-${month}-week-of-${monday}.md`);
      templatePath = path.join(getNotesDir(), "weekly-note-template.md");
      break;
    case "monthly":
      filepath = path.join(getNotesDir(), `${year}-${month}.md`);
      templatePath = path.join(getNotesDir(), "monthly-note-template.md");
      break;
  }

  if (fs.existsSync(filepath)) {
    return filepath;
  }

  // Use template on weekdays, otherwise just use the date
  let content: string;
  const templateContent = fs.readFileSync(templatePath, "utf-8");

  switch (type) {
    case "daily":
      content = templateContent.replace("{{date}}", targetDate.toDateString());
      break;
    case "weekly":
      content = templateContent.replace("{{date}}", "Week of " + targetDate.toDateString());
      break;
    case "monthly":
      const monthName = targetDate.toLocaleString("default", { month: "long" });
      const yearStr = targetDate.getFullYear().toString();
      content = templateContent.replace("{{date}}", `${monthName} ${yearStr}`);
      break;
  }

  return createFile(filepath, content);
}

export function getOrCreateDailyNote(dateOrOffset?: Date | number) {
  return getOrCreateJournalNote({
    type: "daily",
    date: dateOrOffset instanceof Date ? dateOrOffset : undefined,
    offset: typeof dateOrOffset === "number" ? dateOrOffset : undefined,
  });
}

export function getOrCreateWeeklyNote(dateOrOffset?: Date | number) {
  return getOrCreateJournalNote({
    type: "weekly",
    date: dateOrOffset instanceof Date ? dateOrOffset : undefined,
    offset: typeof dateOrOffset === "number" ? dateOrOffset : undefined,
  });
}

export function getOrCreateMonthlyNote(dateOrOffset?: Date | number) {
  return getOrCreateJournalNote({
    type: "monthly",
    date: dateOrOffset instanceof Date ? dateOrOffset : undefined,
    offset: typeof dateOrOffset === "number" ? dateOrOffset : undefined,
  });
}
