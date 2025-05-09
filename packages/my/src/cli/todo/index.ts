import { Command } from "commander";
import { addCommand } from "./add";
import { lsCommand } from "./ls";
import { doneCommand } from "./done";
import { editCommand } from "./edit";
import { rmCommand } from "./rm";

export const todoCommand = new Command("todo")
  .description("Task management commands using Google Tasks")
  .addCommand(addCommand)
  .addCommand(lsCommand)
  .addCommand(doneCommand)
  .addCommand(editCommand)
  .addCommand(rmCommand);