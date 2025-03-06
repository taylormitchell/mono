#!/usr/bin/env bun
import { Command } from "commander";
import chalk from "chalk";
import { initCommand, updateCommand } from "./commands";

// Create the program
const program = new Command();

// Set up program metadata
program
  .name("git-metadata")
  .description("A tool for tracking file metadata in git repositories")
  .version("1.0.0");

// Update command
program
  .command("update")
  .description("Update metadata for files in the repository")
  .option("-f, --force", "Force update all files regardless of lastCommitHash")
  .option("-v, --verbose", "Show verbose output")
  .action(async (options) => {
    console.log(chalk.blue("Updating metadata..."));
    const success = await updateCommand(options);
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
