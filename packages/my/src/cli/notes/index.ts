import { Command } from "commander";
import { tailCommand } from "./tail";
import { diffCommand } from "./diff";

export const notesCommand = new Command("notes")
  .description("Note management utilities")
  .addCommand(tailCommand)
  .addCommand(diffCommand);
