#!/usr/bin/env bun
import { Command } from "commander";
import { initCommand } from "./commands/init";
import { updateCommand } from "./commands/update";
import { saveCommand } from "./commands/save";
import { statusCommand } from "./commands/status";
import { listTodos, createTodo, completeTodo, editTodo, deleteTodo } from "./commands/todo";
import path from "path";
// Create the program
const program = new Command();

// Set up program metadata
program
  .name("gkb")
  .description("A tool for tracking file metadata in git repositories")
  .version("0.0.1");

// Init command
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

// Todo command
const todoCommand = program.command("todo").description("Manage todo items");

// Todo list subcommand
todoCommand
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
    });
    if (!success) {
      process.exit(1);
    }
  });

// Todo create subcommand
todoCommand
  .command("create")
  .description("Create a new todo")
  .argument("<description>", "Description of the todo")
  .option("--due <date>", "Due date for the todo (ISO format or natural language like 'tomorrow')")
  .option("--priority <level>", "Priority level (low, medium, high)")
  .option("--tags <tags>", "Comma-separated list of tags")
  .option("--notes <text>", "Additional notes for the todo")
  .option("--directory <directory>", "Directory to save the todo file to")
  .option("--file <file>", "File to save the todo to")
  .action(async (description, options) => {
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
    let fileOrDirectory = options.directory || options.file || process.cwd();
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
  });

// Todo complete subcommand
todoCommand
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
todoCommand
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
todoCommand
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

// Parse command line arguments
program.parse();

// If no arguments provided, show help
if (process.argv.length <= 2) {
  program.help();
}
