#!/usr/bin/env bun
import { Command } from "commander";
import { initCommand } from "./commands/init";
import { updateCommand } from "./commands/update";
import { saveCommand } from "./commands/save";
import { statusCommand } from "./commands/status";
import { listTodos, createTodo, completeTodo, editTodo, deleteTodo } from "./commands/todo2";
import path from "path";
import {
  listDir,
  createPost,
  createNote,
  getOrCreateDailyNote,
  getOrCreateWeeklyNote,
  getOrCreateMonthlyNote,
} from "@common/note";
import { getNotesDir } from "@common/data";
import { readFileSync } from "fs";
import { getTodayLogEvents } from "@common/logs/utils";
import { parseDuration, formatDuration } from "@common/logs/types";
import { getTodos, groupBy, lessThanOrEqualTo, listTodosDueToday } from "@common/todo/parsers";
import type { Todo } from "@common/todo/types";
import fs from "fs";
import { executeGit } from "../../shared/git";
import os from "os";
import { z } from "zod";

function parseDateOrOffset(dateOrOffset: string): Date | number {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOrOffset)) {
    const [year, month, day] = dateOrOffset.split("-").map(Number);
    return new Date(year, month - 1, day);
  } else if (!isNaN(parseInt(dateOrOffset))) {
    return parseInt(dateOrOffset);
  } else {
    throw new Error(
      `Invalid input: must be a date in YYYY-MM-DD format or a number. Received: ${dateOrOffset}`
    );
  }
}

// Load config file
const configSchema = z.object({ rootDir: z.string(), defaultEditor: z.string().optional() });
type Config = z.infer<typeof configSchema>;
let config: Config = {};
try {
  const data = JSON.parse(readFileSync(path.join(os.homedir(), ".kbrc.json"), "utf-8"));
  config = configSchema.parse(data);
} catch (error) {
  console.warn("Error loading config file", error);
}

const program = new Command().name("kb").description("A tool for managing my notes");

// -------- Top Level Commands --------

program
  .command("cd")
  .description("Set current working directory to the notes repo")
  .action(() => {
    process.chdir(getNotesDir());
  });

program
  .command("root")
  .description("Open the root note")
  .action(() => {
    console.log(getNotesDir());
  });

program
  .command("init")
  .description("Initialize a new git repository")
  .action(async () => {
    const success = await initCommand();
    if (!success) {
      process.exit(1);
    }
  });

// Update command
program
  .command("update")
  .description("Update metadata for files in the repository")
  .option("-f, --force", "Force update all files regardless of lastCommitHash")
  .option("-v, --verbose", "Show verbose output")
  .action(async (options) => {
    const success = await updateCommand(options);
    if (!success) {
      process.exit(1);
    }
  });

// Save command
program
  .command("save")
  .description("Save the current state of the repository")
  .action(async () => {
    const success = await saveCommand();
    if (!success) {
      process.exit(1);
    }
  });

// Status command
program
  .command("status")
  .description("Show the status of the repository")
  .action(async () => {
    const success = await statusCommand();
    if (!success) {
      process.exit(1);
    }
  });



program
  .command("daily [dateOrOffset]")
  .description("Open or create daily note with optional date or offset from today")
  .action((dateOrOffset, options) => {
    const date = dateOrOffset ? parseDateOrOffset(dateOrOffset) : undefined;
    const path = getOrCreateDailyNote(date);
    console.log(path);
  });

program
  .command("weekly [dateOrOffset]")
  .description("Open or create this week's note with optional date or offset from today")
  .action((dateOrOffset) => {
    const date = dateOrOffset ? parseDateOrOffset(dateOrOffset) : undefined;
    const path = getOrCreateWeeklyNote(date);
    console.log(path);
  });

program
  .command("monthly")
  .description("Open or create this month's note")
  .action(() => {
    const path = getOrCreateMonthlyNote();
    console.log(path);
  });

program
  .command("today")
  .description("Output today's daily note and summarize log events")
  .action(() => {
    // Output today's daily note
    const todayNote = getOrCreateDailyNote();
    console.log("Today's Daily Note:");
    console.log(readFileSync(todayNote, "utf-8"));

    // Summarize today's log events
    console.log("\nToday's Log Events Summary:");
    const logEvents = getTodayLogEvents();

    if (logEvents.length > 0) {
      const summary = logEvents.reduce((acc, event) => {
        if (!acc[event.type]) {
          acc[event.type] = { count: 0, totalDuration: 0, message: "" };
        }
        acc[event.type].count++;
        if (event.duration) {
          acc[event.type].totalDuration += parseDuration(event.duration);
        }
        if (event.message) {
          acc[event.type].message = event.message;
        }
        return acc;
      }, {});

      Object.entries(summary).forEach(([type, data]: [string, any]) => {
        let details = [data.totalDuration && formatDuration(data.totalDuration), data.message]
          .filter(Boolean)
          .join(" ");
        details = details ? `(${details})` : "";
        console.log(`${type}: ${data.count} ${details}`);
      });
    } else {
      console.log("No log events for today.");
    }
  });

program
  .command("post [path]")
  .option("-m, --message <content>", "content of the post")
  .description("Create a new post with optional content")
  .action((p: string | undefined, options: Partial<{ message: string }>) => {
    if (p !== undefined && !path.isAbsolute(p)) {
      if (p.startsWith("@")) {
        p = path.join(getNotesDir(), p.slice(1));
      } else {
        p = path.join(process.cwd(), p);
      }
    }
    p = createPost(p, options.message);
    console.log(p);
  });

// Analogous to how `tail` shows you the last lines of a file, this
// command shows you the last `n` files modified in the notes repo.
// TODO: This is not working as expected and slow.
program
  .command("tail [n]")
  .description("Show the last `n` files modified in the notes repo")
  .action(async (n = 5) => {
    console.log("Not implemented");
    return;
    const notesDir = getNotesDir();
    const files: { path: string; lastUpdated: Date }[] = [];

    // First get modified files in working directory
    const statusResult = await executeGit(["status", "--porcelain"], { cwd: notesDir });
    if (statusResult.success) {
      const modifiedFiles = statusResult.data
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          const filePath = line.slice(3);
          const fullPath = path.join(notesDir, filePath);
          let stats;
          try {
            stats = fs.statSync(fullPath);
          } catch (error) {
            // If file doesn't exist, use current date
            stats = { mtime: new Date() };
          }
          return {
            path: filePath,
            lastUpdated: stats.mtime,
          };
        });
      files.push(...modifiedFiles);
    }

    // If we need more files, walk through commit history
    if (files.length < n) {
      const logResult = await executeGit(["log", "--format=%H%n%aI", "--name-only"], {
        cwd: notesDir,
      });

      if (logResult.success) {
        const lines = logResult.data.split("\n");
        let currentCommitHash: string | null = null;
        let currentCommitDate: Date | null = null;

        for (const line of lines) {
          if (!line.trim()) continue;

          if (!currentCommitHash) {
            currentCommitHash = line;
            continue;
          }

          if (!currentCommitDate) {
            currentCommitDate = new Date(line);
            continue;
          }

          // This is a file path
          const filePath = line;
          if (!files.some((f) => f.path === filePath)) {
            files.push({
              path: filePath,
              lastUpdated: currentCommitDate,
            });
          }

          if (files.length >= n) break;

          // Reset for next commit
          if (!lines[lines.indexOf(line) + 1]?.trim()) {
            currentCommitHash = null;
            currentCommitDate = null;
          }
        }
      }
    }

    // Sort by most recently updated
    files.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());

    // Trim to requested number
    files.splice(n);
    files.forEach((file) => {
      console.log(file.path, file.lastUpdated);
    });
  });

// -------- Todo --------
// Todo api which parses todos from markdown files.

const todoCommand = program.command("todo").description("Manage todo items");

function renderByFile(todos: Todo[]) {
  const todosByFile = groupBy(todos, "relativeFilename");
  todosByFile.forEach((todos, relativeFilename) => {
    console.log(`File: ${relativeFilename}`);
    console.log("=".repeat(relativeFilename.length + 6));
    todos.forEach((todo) => {
      console.log(
        `  ${todo.status}: ${todo.text}`,
        todo.due ? `Due: ${todo.due.toISOString().split("T")[0]}` : ""
      );
    });
  });
}

todoCommand
  .command("ls [pathname]")
  .description("List all todos")
  .option("-j, --ignore-journals", "Ignore todos from journal entries")
  .option(
    "-d, --due [date]",
    "Show todos due by the specified date or offset (e.g., '2023-09-15' or '3' for 3 days from now)"
  )
  .action((pathname, options) => {
    let todos = getTodos(pathname).filter((todo) => todo.status === "TODO");
    if (options.ignoreJournals) {
      const rootDir = getNotesDir();
      todos = todos.filter((todo) => !todo.filename.startsWith(path.join(rootDir, "journals")));
    }
    if (options.due) {
      let dueDate = new Date();
      if (options.due === true) {
        // no-op
      } else if (options.due.match(/^\d+$/)) {
        const offset = parseInt(options.due);
        dueDate.setDate(dueDate.getDate() + offset);
      } else if (options.due.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dueDate = new Date(options.due);
      }
      todos = todos.filter((todo) => todo.due && lessThanOrEqualTo(todo.due, dueDate));
    }
    renderByFile(todos);
  });

todoCommand
  .command("due [offset]")
  .description("List todos due today")
  .option("-i, --ignore-today", "Ignore todos from today's daily page")
  .action((offset = 0, options) => {
    listTodosDueToday(getNotesDir(), parseInt(offset), options.ignoreToday);
  });

// add a line to the top of the /gtd/someday-maybe.md file
todoCommand
  .command("sm [line]")
  .description("Add a line to the top of the /gtd/someday-maybe.md file")
  .action((line) => {
    const filename = path.join(getNotesDir(), "gtd", "someday-maybe.md");
    fs.appendFileSync(filename, "\n" + line);
  });

// add a todo to the bottom of the /gtd/todo.md file
todoCommand
  .command("todo [line]")
  .description("Add a todo to the bottom of the /gtd/todo.md file")
  .action((line) => {
    const filename = path.join(getNotesDir(), "gtd", "todo.md");
    fs.appendFileSync(filename, "\nTODO " + line);
  });

// -------- Todo (experimental)  --------
// A new experimental set of todo commands for managing todos
// defined using individual files.

const todoExperimentalCommand = program.command("todo2").description("Manage todo items");

// Todo list subcommand
todoExperimentalCommand
  .command("list")
  .description("List all todos in the current directory")
  .option("--filter <filter>", "Filter todos (e.g., 'status:incomplete due:today')")
  .option("--sort <field>", "Sort todos by field (createdAt, dueDate, priority, description)")
  .option("--direction <direction>", "Sort direction (asc or desc)", "desc")
  .action(async (options) => {
    const success = await listTodos({
      filter: options.filter,
      sort: options.sort,
      direction: options.direction as "asc" | "desc",
      directory: options.directory || config.rootDir,
    });
    if (!success) {
      process.exit(1);
    }
  });

// Todo create subcommand
todoExperimentalCommand
  .command("create")
  .description("Create a new todo")
  .argument("<description>", "Description of the todo")
  .option("--due <date>", "Due date for the todo (ISO format or natural language like 'tomorrow')")
  .option("--priority <level>", "Priority level (low, medium, high)")
  .option("--tags <tags>", "Comma-separated list of tags")
  .option("--notes <text>", "Additional notes for the todo")
  .option("--directory <directory>", "Directory to save the todo file to")
  .option("--file <file>", "File to save the todo to")
  .action(
    async (
      description: string,
      options: {
        due?: string;
        priority?: string;
        tags?: string;
        notes?: string;
        directory?: string;
        file?: string;
      }
    ) => {
      // Process tags if provided
      const tags = options.tags
        ? options.tags.split(",").map((tag: string) => tag.trim())
        : undefined;

      // Process due date if provided
      let dueDate = options.due;
      if (dueDate) {
        // Handle natural language dates
        if (dueDate === "today") {
          dueDate = new Date().toISOString();
        } else if (dueDate === "tomorrow") {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          dueDate = tomorrow.toISOString();
        } else if (dueDate.match(/^\d+d$/)) {
          // Handle "3d" format (3 days from now)
          const days = parseInt(dueDate.replace("d", ""));
          const date = new Date();
          date.setDate(date.getDate() + days);
          dueDate = date.toISOString();
        } else if (!dueDate.includes("T")) {
          // If it's just a date without time, add time
          dueDate = new Date(`${dueDate}T23:59:59`).toISOString();
        }
      }

      // Process file or directory if provided
      let fileOrDirectory = options.directory || config.rootDir;
      if (!fileOrDirectory.startsWith("/")) {
        fileOrDirectory = path.join(process.cwd(), fileOrDirectory);
      }

      const success = await createTodo(description, {
        dueDate,
        priority: options.priority as "low" | "medium" | "high" | undefined,
        tags,
        notes: options.notes,
        fileOrDirectory,
      });

      if (!success) {
        process.exit(1);
      }
    }
  );

// Todo complete subcommand
todoExperimentalCommand
  .command("complete")
  .description("Mark a todo as completed or incomplete (toggles status)")
  .argument("<id>", "ID of the todo")
  .action(async (id) => {
    const success = await completeTodo(id);
    if (!success) {
      process.exit(1);
    }
  });

// Todo delete subcommand
todoExperimentalCommand
  .command("delete")
  .description("Delete one or more todos")
  .argument("<ids...>", "ID(s) of the todo(s) to delete (space-separated)")
  .action(async (ids: string[]) => {
    const success = await deleteTodo(ids);
    if (!success) {
      process.exit(1);
    }
  });

// Todo edit subcommand
todoExperimentalCommand
  .command("edit")
  .description("Edit a todo")
  .argument("<id>", "ID of the todo")
  .option("--description <text>", "New description for the todo")
  .option("--due <date>", "New due date (ISO format or natural language like 'tomorrow')")
  .option("--priority <level>", "New priority level (low, medium, high)")
  .option("--tags <tags>", "New comma-separated list of tags")
  .option("--notes <text>", "New additional notes")
  .option("--clear-due", "Clear the due date")
  .option("--clear-priority", "Clear the priority")
  .option("--clear-tags", "Clear all tags")
  .option("--clear-notes", "Clear the notes")
  .action(async (id, options) => {
    // Process tags if provided
    const tags = options.tags
      ? options.tags.split(",").map((tag: string) => tag.trim())
      : undefined;

    // Process due date if provided
    let dueDate = options.due;
    if (dueDate) {
      // Handle natural language dates
      if (dueDate === "today") {
        dueDate = new Date().toISOString();
      } else if (dueDate === "tomorrow") {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dueDate = tomorrow.toISOString();
      } else if (dueDate.match(/^\d+d$/)) {
        // Handle "3d" format (3 days from now)
        const days = parseInt(dueDate.replace("d", ""));
        const date = new Date();
        date.setDate(date.getDate() + days);
        dueDate = date.toISOString();
      } else if (!dueDate.includes("T")) {
        // If it's just a date without time, add time
        dueDate = new Date(`${dueDate}T23:59:59`).toISOString();
      }
    } else if (options.clearDue) {
      dueDate = "";
    }

    // Handle clearing options
    const priority = options.clearPriority ? "" : options.priority;
    const updatedTags = options.clearTags ? [] : tags;
    const notes = options.clearNotes ? "" : options.notes;

    const updates: any = {};

    if (options.description) updates.description = options.description;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (priority !== undefined) updates.priority = priority;
    if (updatedTags !== undefined) updates.tags = updatedTags;
    if (notes !== undefined) updates.notes = notes;

    // Check if any updates were provided
    if (Object.keys(updates).length === 0) {
      console.error(
        "No updates provided. Use --description, --due, --priority, --tags, or --notes to specify updates."
      );
      process.exit(1);
    }

    const success = await editTodo(id, updates);
    if (!success) {
      process.exit(1);
    }
  });

// Catch-all command for unmatched commands
program.on("command:*", (operands) => {
  if (operands.length === 1 && operands[0].includes(" ")) {
    // A quick way to create a post via `kb "some post text`"
    const p = createPost(getNotesDir(), operands[0]);
    console.log(p);
  } else {
    console.error(`Unknown command: ${operands.join(" ")}`);
    console.error("See --help for a list of available commands.");
    process.exit(1);
  }
});

// Parse command line arguments
program.parse();

// If no arguments provided, show help
if (process.argv.length <= 2) {
  program.help();
}
