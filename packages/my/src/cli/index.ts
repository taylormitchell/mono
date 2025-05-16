#!/usr/bin/env bun
import { program } from "commander";
import chalk from "chalk";
import { syncCommand } from "./sync";
import { pathCommand } from "./path";
import { scriptCommand } from "./script";
import { cdCommand } from "./cd";
import { lsCommand } from "./ls";
import { noteCommand, createNoteAction as catchAllAction } from "./note";
import { notesCommand } from "./notes";
import { calendarCommand } from "./calendar";
import { todoCommand } from "./todo";
import { aiCommand } from "./ai";
import { loadConfig } from "../lib/config";
import { askCommand } from "./ask";
import { cmdCommand } from "./cmd";
import { linearCommand } from "./linear";
import { mcpCommand } from "./mcp";
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
program.addCommand(calendarCommand);
program.addCommand(todoCommand);
program.addCommand(aiCommand);
program.addCommand(askCommand);
program.addCommand(cmdCommand);
program.addCommand(linearCommand);
program.addCommand(mcpCommand);
program.arguments("[text...]").action(catchAllAction);

// Parse command line arguments
program.parse();
