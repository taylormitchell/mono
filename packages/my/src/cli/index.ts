#!/usr/bin/env bun
import { program } from "commander";
import chalk from "chalk";
import { syncCommand } from "./sync";
import { pathCommand } from "./path";
import { scriptCommand } from "./script";
import { cdCommand } from "./cd";
import { lsCommand } from "./ls";
import { noteCommand } from "./note";
import { notesCommand } from "./notes";
import { loadConfig } from "../lib/config";

// Create the program
program
  .name("my")
  .description("Unified CLI tool for personal productivity")
  .version("0.1.0")
  .hook("preAction", async () => {
    await loadConfig();
  });

// Register commands
program.addCommand(syncCommand);
program.addCommand(pathCommand);
program.addCommand(scriptCommand);
program.addCommand(cdCommand);
program.addCommand(lsCommand);
program.addCommand(noteCommand);
program.addCommand(notesCommand);

// Error handling for unknown commands
program.on("command:*", () => {
  console.error(chalk.red(`Error: unknown command "${program.args.join(" ")}"`));
  console.log(`See ${chalk.green("--help")} for a list of available commands.`);
  process.exit(1);
});

// Parse command line arguments
program.parse();
