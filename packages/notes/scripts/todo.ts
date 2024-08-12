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

interface Todo {
  text: string;
  status: "TODO" | "DOING" | "DONE";
  dueDate?: Date;
  filename: string;
  heading: string;
}

type Schedule =
  | { type: "daily" }
  | { type: "weekly"; day: number }
  | { type: "monthly"; day: number };

interface RecurringTodo {
  text: string;
  schedule: Schedule;
  filename: string;
  heading: string;
}

const TODO_REGEX = /^- (TODO|DOING|DONE):?\s*(.+)$/;
const RECURRING_TODO_REGEX = /^- RECURRING:?\s*(.+)$/;
const DUE_DATE_REGEX = /^  due-date: (\d{4}-\d{2}-\d{2})$/;
const SCHEDULE_REGEX = /^  schedule: (.*)$/;

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

function parseTodos(content: string, filename: string): Todo[] {
  const lines = content.split("\n");
  const todos: Todo[] = [];
  let currentHeading = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("#")) {
      currentHeading = line.trim();
    }

    const todoMatch = line.match(TODO_REGEX);
    if (todoMatch) {
      const [, status, text] = todoMatch;
      const todo: Todo = {
        text,
        status: status as "TODO" | "DOING" | "DONE",
        filename,
        heading: currentHeading,
      };

      if (i + 1 < lines.length) {
        const dueDateMatch = lines[i + 1].match(DUE_DATE_REGEX);
        if (dueDateMatch) {
          todo.dueDate = new Date(dueDateMatch[1]);
          i++; // Skip the due-date line
        }
      }

      todos.push(todo);
    }
  }

  return todos;
}

function parseRecurringTodos(content: string, filename: string): RecurringTodo[] {
  const lines = content.split("\n");
  const todos: RecurringTodo[] = [];
  let currentHeading = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("#")) {
      currentHeading = line.trim();
    }

    const todoMatch = line.match(RECURRING_TODO_REGEX);
    if (todoMatch) {
      const [, text] = todoMatch;
      if (i + 1 < lines.length) {
        const schedule = parseSchedule(lines[i + 1]);
        if (schedule) {
          const todo: RecurringTodo = {
            text,
            schedule,
            filename,
            heading: currentHeading,
          };
          todos.push(todo);
          i++; // Skip the schedule line
        }
      }
    }
  }

  return todos;
}

function getAllTodos(pathname: string): Todo[] {
  let files: string[];

  if (fs.statSync(pathname).isDirectory()) {
    files = glob.sync(path.join(pathname, "**/*.md"));
  } else if (pathname.endsWith(".md")) {
    files = [pathname];
  } else {
    console.error(chalk.red(`Invalid path: ${pathname}. Must be a directory or a .md file.`));
    return [];
  }

  let allTodos: Todo[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const todos = parseTodos(content, path.relative(path.dirname(file), file));
    allTodos = allTodos.concat(todos);
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
    const todos = parseRecurringTodos(content, path.relative(path.dirname(file), file));
    allTodos = allTodos.concat(todos);
  }

  return allTodos;
}

function groupTodosByFileAndHeading(todos: Todo[]): Map<string, Map<string, Todo[]>> {
  const groupedTodos = new Map<string, Map<string, Todo[]>>();

  for (const todo of todos) {
    if (!groupedTodos.has(todo.filename)) {
      groupedTodos.set(todo.filename, new Map<string, Todo[]>());
    }
    const fileGroup = groupedTodos.get(todo.filename)!;

    if (!fileGroup.has(todo.heading)) {
      fileGroup.set(todo.heading, []);
    }
    fileGroup.get(todo.heading)!.push(todo);
  }

  return groupedTodos;
}

function printGroupedTodos(groupedTodos: Map<string, Map<string, Todo[]>>): void {
  for (const [filename, fileGroup] of groupedTodos) {
    console.log(chalk.cyan(`File: ${filename}`));
    console.log(chalk.cyan("=".repeat(filename.length + 6)));

    for (const [heading, todos] of fileGroup) {
      console.log(chalk.yellow(heading));

      for (const todo of todos) {
        console.log(chalk.bold(`  ${todo.status}: ${todo.text}`));
        if (todo.dueDate) {
          console.log(chalk.green(`    Due: ${todo.dueDate.toISOString().split("T")[0]}`));
        }
      }
      console.log();
    }
    console.log();
  }
}

function listAllTodos(path: string): void {
  const todos = getAllTodos(path);
  const groupedTodos = groupTodosByFileAndHeading(todos);
  printGroupedTodos(groupedTodos);
}

function listTodosDueToday(path: string): void {
  const todos = getAllTodos(path);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todosDueToday = todos.filter((todo) => {
    if (!todo.dueDate) return false;
    const dueDate = new Date(todo.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === today.getTime();
  });

  if (todosDueToday.length === 0) {
    console.log(chalk.green("No todos due today!"));
    return;
  }

  console.log(chalk.bold("Todos due today:"));
  const groupedTodosDueToday = groupTodosByFileAndHeading(todosDueToday);
  printGroupedTodos(groupedTodosDueToday);
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
  .command("due-today [path]")
  .description("List todos due today")
  .action((path = process.cwd()) => {
    listTodosDueToday(path);
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

program.parse(process.argv);
