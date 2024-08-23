import fs from "fs";
import path from "path";

const TODO_KEYWORDS = ["TODO", "DOING", "DONE", "MAYBE", "WAITING"] as const;
const TODO_REGEX = new RegExp(`^-?\\s*(${TODO_KEYWORDS.join("|")})`);
type TodoStatus = (typeof TODO_KEYWORDS)[number];
type Todo = {
  type: "todo";
  text: string;
  status: TodoStatus;
  due?: Date;
  id?: string;
  filename?: string;
  headings?: Heading[];
  line?: number;
  raw: string;
};

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

function parseKeyValue(
  line: string,
  offset: number = 0
): { key: string; value: string; start: number; end: number } | undefined {
  for (let c = offset; c < line.length; c++) {
    if (line[c] === "{") {
      // handle id
      if (line[c + 1] === "#") {
        const match = line.slice(c).match(/\{#(\w+)\}/);
        if (match) {
          return { key: "id", value: match[1], start: c, end: c + match[0].length - 1 };
        }
      } else {
        // handle other key-value pairs
        const match = line.slice(c).match(/\{(\w+):([^:]*)\}/);
        if (match) {
          return { key: match[1], value: match[2], start: c, end: c + match[0].length - 1 };
        }
      }
    }
  }
}

function parseTodo(line: string) {
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
  }
  let id: string | undefined = undefined;
  const idKv = kvs.get("id");
  if (idKv) {
    id = idKv.value.slice(1);
  }

  const text = line.slice(prefix.length, kvStart || line.length).trim();
  return { status, text, due, id };
}

function parseHeading(line: string) {
  const match = line.match(/^#+/);
  if (!match) {
    return;
  }
  const level = match[0].length;
  const text = line.slice(level).trim();
  return { level, text };
}

export function parseMarkdown(content: string) {
  const lines = content.split("\n");
  const todos: Todo[] = [];
  const currentHeadings: Heading[] = [];
  for (let i = 0; i < lines.length; i++) {
    const heading = parseHeading(lines[i]);
    if (heading) {
      currentHeadings.slice(heading.level);
      currentHeadings.push({ type: "heading", level: heading.level, text: heading.text });
      continue;
    }
    const todo = parseTodo(lines[i]);
    if (todo) {
      todos.push({ ...todo, type: "todo", headings: currentHeadings, raw: lines[i], line: i });
      continue;
    }
  }
  return todos;
}

export function parseMarkdownFile(filename: string): Todo[] {
  const content = fs.readFileSync(filename, "utf-8");
  let todos = parseMarkdown(content);
  const date = pathToDate(filename);
  return todos.map((todo) => ({ ...todo, due: todo.due || date, filename }));
}

export function getTodos(pathname: string, ignore = true): Todo[] {
  let files: string[];

  if (fs.statSync(pathname).isDirectory()) {
    files = [];
    const walkDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
          files.push(fullPath);
        }
      }
    };
    walkDir(pathname);
  } else if (pathname.endsWith(".md")) {
    files = [pathname];
  } else {
    console.error(`Invalid path: ${pathname}. Must be a directory or a .md file.`);
    return [];
  }

  // ignore test files
  if (ignore) {
    files = files.filter((file) => !file.includes("test.md"));
  }

  return files.flatMap((file) => parseMarkdownFile(file));
}

export function todoToRaw(todo: Todo) {
  return `${todo.status} ${todo.text} ${todo.due ? `due: ${todo.due.toISOString()}` : ""}`;
}

export function updateTodo(todo: Todo) {
  if (!todo.filename || todo.line === undefined || !todo.raw) {
    return false;
  }

  const content = fs.readFileSync(todo.filename, "utf-8");
  const lines = content.split("\n");

  if (lines[todo.line] === todo.raw) {
    lines[todo.line] = todoToRaw(todo);
    fs.writeFileSync(todo.filename, lines.join("\n"));
    return true;
  }

  return false;
}
