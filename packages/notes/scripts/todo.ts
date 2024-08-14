import fs from "fs";
import { Command } from "commander";
import { glob } from "glob";
import chalk from "chalk";
import path from "path";
chalk.level = 3;

let rootDir = __dirname;
while (!fs.existsSync(path.join(rootDir, "package.json"))) {
  rootDir = path.dirname(rootDir);
}

const months = [
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

function pathToDate(pathname: string): Date | undefined {
  const parts = pathname.split("/").reverse();
  const day = parseInt(parts[0].split(".")[0]);
  if (isNaN(day)) {
    return;
  }
  const month = months.indexOf(parts[1].toLocaleLowerCase());
  if (month === -1) {
    return;
  }
  const year = parseInt(parts[2]);
  if (isNaN(year)) {
    return;
  }
  return new Date(year, month, day);
}

type Heading = {
  type: "heading";
  level: number;
  text: string;
};

type Todo = {
  type: "todo";
  text: string;
  status: "TODO" | "DOING" | "DONE";
  due?: Date;
  id?: string;
  filename: string;
  headings: Heading[];
};

type Schedule =
  | { type: "daily" }
  | { type: "weekly"; day: number }
  | { type: "monthly"; day: number };

interface RecurringTodo {
  type: "recurring-todo";
  text: string;
  schedule: Schedule;
  filename: string;
  headings: Heading[];
}

const TODO_KEYWORDS = ["TODO", "DOING", "DONE"] as const;
const TODO_REGEX = new RegExp(`^-?\\s*(${TODO_KEYWORDS.join("|")})`);
const RECURRING_TODO_REGEX = /^- RECURRING:?\s*(.+)$/;
const DUE_DATE_REGEX = /^\s*due: (\d{4}-\d{2}-\d{2})$/;
const SCHEDULE_REGEX = /^\s*schedule: (.*)$/;

function parseKeyValue(
  line: string,
  i: number = 0
): { key: string; value: string; start: number; end: number } | undefined {
  let key = "";
  let value = "";
  let start: number | null = null;
  let end: number | null = null;
  for (let c = i; c < line.length; c++) {
    if (line[c] === "{") {
      start = c;
      // consume key
      while (line[c] !== ":" && line[c] !== "}" && c < line.length) {
        c++;
      }
      if (line[c] !== ":") continue;
      key = line.slice(start + 1, c);
      // consume value
      c++;
      const valueStart = c + 1;
      while (line[c] !== "}" && c < line.length) {
        c++;
      }
      if (line[c] !== "}") continue;
      value = line.slice(valueStart, c).trim();
      end = c;
      break;
    }
  }
  if (!key || !start || !end) return;
  return { key, value, start, end };
}

function parseTodo(line: string, ctx: { filename: string; headings: Heading[] }): Todo | undefined {
  const { filename, headings } = ctx;
  if (!line) {
    return;
  }
  // only needs to start with the keyword
  const match = line.match(TODO_REGEX);
  if (!match) {
    return;
  }
  const [prefix, keyword] = match;
  const status = TODO_KEYWORDS.find((k) => k === keyword);
  if (!status) {
    return;
  }

  // Parse key-value pairs
  // Assume that once you hit the first key-value pair, all subsequent lines are key-value pairs
  const kvs: Map<string, { key: string; value: string }> = new Map();
  let kvStart: number | null = null;
  for (let c = 0; c < line.length; c++) {
    const kv = parseKeyValue(line, c);
    if (!kv) {
      break;
    }
    kvs.set(kv.key, kv);
    kvStart = kvStart || kv.start;
    c = kv.end + 1;
  }

  // Grab values for supported key-value pairs
  let due: Date | undefined = undefined;
  const dueKv = kvs.get("due");
  if (dueKv) {
    const parts = dueKv.value.split("-");
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    due = new Date(year, month, day);
    due.setHours(0, 0, 0, 0);
  } else {
    // Or parse due date from filename
    const date = pathToDate(filename);
    if (date) {
      due = date;
    }
  }
  let id: string | undefined = undefined;
  const idString = kvs.get("id");
  if (idString && idString.value.startsWith("#")) {
    id = idString.value.slice(1);
  }

  const text = line.slice(prefix.length, kvStart || line.length).trim();
  return { type: "todo", status, text, due, id, filename, headings };
}

function parseHeading(
  content: string[],
  ctx: { i: number }
): { value: Heading; nextLine: number } | undefined {
  const { i } = ctx;
  const line = content[i];
  if (!line) {
    return;
  }
  const match = line.match(/^#+/);
  if (!match) {
    return;
  }
  const level = match[0].length;
  const text = line.slice(level).trim();
  return {
    value: { type: "heading", level, text },
    nextLine: i + 1,
  };
}

function parseRecurringTodo(
  content: string[],
  ctx: { i: number; filename: string; headings: Heading[] }
): { value: RecurringTodo; nextLine: number } | undefined {
  const { i, filename, headings } = ctx;
  const line = content[i];
  if (!line) {
    return;
  }
  const match = line.match(RECURRING_TODO_REGEX);
  if (!match) {
    return;
  }
  const text = match[1];
  let schedule: Schedule | undefined;
  let nextLine = i + 1;
  while (
    nextLine < content.length &&
    content[nextLine] !== "" &&
    !content[nextLine].match(/^[-*]/)
  ) {
    // Parse schedule key-value pair
    const scheduleMatch = content[nextLine].match(SCHEDULE_REGEX);
    if (scheduleMatch) {
      schedule = parseSchedule(scheduleMatch[1]);
    }
    nextLine++;
  }
  if (!schedule) {
    console.error(chalk.red(`No schedule found for recurring todo: ${text}`));
    return;
  }
  return {
    value: { type: "recurring-todo", text, schedule, filename, headings },
    nextLine,
  };
}

function parseSchedule(line: string): Schedule | undefined {
  const match = line.match(SCHEDULE_REGEX);
  if (!match) return undefined;
  const [, schedule] = match;
  if (schedule === "daily") {
    return { type: "daily" };
  } else if (schedule.endsWith(" of every month")) {
    const day = parseInt(schedule.split(" ")[0]);
    if (day < 1 || day > 31 || isNaN(day)) {
      console.error(chalk.red(`Invalid day of month: ${day}`));
      return undefined;
    }
    return { type: "monthly", day };
  } else if (schedule.endsWith(" of every week")) {
    const day = parseInt(schedule.split(" ")[0]);
    if (day < 0 || day > 6 || isNaN(day)) {
      console.error(chalk.red(`Invalid day of week: ${day}`));
      return undefined;
    }
    return { type: "weekly", day };
  }
}

function parseMarkdown(content: string, filename: string): (Todo | RecurringTodo)[] {
  const lines = content.split("\n");
  const todos: (Todo | RecurringTodo)[] = [];
  const headings: Heading[] = [];
  let i = 0;
  while (i < lines.length) {
    const heading = parseHeading(lines, { i });
    if (heading) {
      headings.slice(heading.value.level);
      headings.push(heading.value);
      i = heading.nextLine;
      continue;
    }
    const todo = parseTodo(lines[i], { filename, headings: [] });
    if (todo) {
      todos.push(todo);
      i++;
      continue;
    }
    // const recurringTodo = parseRecurringTodo(lines, { i, filename, headings: [] });
    // if (recurringTodo) {
    //   todos.push(recurringTodo.value);
    //   i = recurringTodo.nextLine;
    //   continue;
    // }
    i++;
  }
  return todos;
}

function getAllTodos(pathname: string): Map<string, Todo[]> {
  let files: string[];

  if (fs.statSync(pathname).isDirectory()) {
    files = glob.sync(path.join(pathname, "**/*.md"));
  } else if (pathname.endsWith(".md")) {
    files = [pathname];
  } else {
    console.error(chalk.red(`Invalid path: ${pathname}. Must be a directory or a .md file.`));
    return new Map();
  }

  const allTodos = new Map<string, Todo[]>();
  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const todos = parseMarkdown(content, file).filter((todo) => todo.type === "todo") as Todo[];
    if (todos.length > 0) {
      allTodos.set(file, todos);
    }
  }

  return allTodos;
}

function getAllRecurringTodos(pathname: string): RecurringTodo[] {
  let files: string[];

  if (fs.statSync(pathname).isDirectory()) {
    files = glob.sync(path.join(pathname, "**/*.md"));
  } else if (pathname.endsWith(".md")) {
    files = [pathname];
  } else {
    console.error(chalk.red(`Invalid path: ${pathname}. Must be a directory or a .md file.`));
    return [];
  }

  let allTodos: RecurringTodo[] = [];
  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const todos = parseMarkdown(content, file);
    todos.forEach((todo) => {
      if (todo.type === "recurring-todo") {
        allTodos.push(todo);
      }
    });
  }

  return allTodos;
}

function listAllTodos(path: string): void {
  const todosByFile = getAllTodos(path);
  todosByFile.forEach((todos, filename) => {
    console.log(chalk.cyan(`File: ${filename}`));
    console.log(chalk.cyan("=".repeat(filename.length + 6)));
    todos.forEach((todo) => {
      console.log(chalk.bold(`  ${todo.status}: ${todo.text}`));
      if (todo.due) {
        console.log(chalk.green(`    Due: ${todo.due.toISOString().split("T")[0]}`));
      }
      if (todo.id) {
        console.log(chalk.green(`    ID: ${todo.id}`));
      }
    });
    console.log();
  });
}

function sameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function listTodosDueToday(offset: number = 0): void {
  const todosByFile = getAllTodos(rootDir);
  const day = new Date();
  day.setDate(day.getDate() + offset);
  day.setHours(0, 0, 0, 0);
  todosByFile.forEach((todos, filename) => {
    const dueToday = todos.filter((todo) => todo.due && sameDay(todo.due, day));
    if (dueToday.length === 0) {
      return;
    }
    console.log(chalk.cyan(`File: ${filename}`));
    console.log(chalk.cyan("=".repeat(filename.length + 6)));
    dueToday.forEach((todo) => {
      console.log(chalk.bold(`  ${todo.status}: ${todo.text}`));
      if (todo.due) {
        console.log(chalk.green(`    Due: ${todo.due.toISOString().split("T")[0]}`));
      }
    });
    console.log();
  });
}

function addTodo(path: string, filename: string, todoText: string): void {
  const filePath = fs.statSync(path).isDirectory() ? path.join(path, filename) : path;

  if (!fs.existsSync(filePath)) {
    console.error(chalk.red(`File ${filePath} does not exist.`));
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  let insertIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith("#")) {
      insertIndex = i;
      break;
    }
  }

  lines.splice(insertIndex, 0, `- TODO: ${todoText}`);
  fs.writeFileSync(filePath, lines.join("\n"));
  console.log(chalk.green(`Todo added to ${filePath}`));
}

const program = new Command();

program.version("1.0.0").description("A CLI tool for managing todos in markdown files");

program
  .command("list [path]")
  .description("List all todos")
  .action((path = process.cwd()) => {
    listAllTodos(path);
  });

program
  .command("due [offset]")
  .description("List todos due today")
  .action((offset = 0) => {
    listTodosDueToday(parseInt(offset));
  });

program
  .command("add <filename> <todoText> [path]")
  .description("Add a new todo to a file")
  .action((filename, todoText, path = process.cwd()) => {
    addTodo(path, filename, todoText);
  });

program
  .command("list-recurring [path]")
  .description("List all recurring todos")
  .action((path = process.cwd()) => {
    const todos = getAllRecurringTodos(path);
    console.log(todos);
  });

// program.parse(process.argv);
listAllTodos(
  "/Users/taylormitchell/Code/taylors-tech/packages/notes/journals/2024/august/week-of-12.md"
);
