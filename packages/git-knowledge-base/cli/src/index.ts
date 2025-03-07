#!/usr/bin/env bun
import { Command } from "commander";
import { initCommand } from "./commands/init";
import { updateCommand } from "./commands/update";
import { saveCommand } from "./commands/save";
import { statusCommand } from "./commands/status";

// Create the program
const program = new Command();

// Set up program metadata
program
  .name("git-metadata")
  .description("A tool for tracking file metadata in git repositories")
  .version("1.0.0");

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

// Parse command line arguments
program.parse();

// If no arguments provided, show help
if (process.argv.length <= 2) {
  program.help();
}
