import { Command } from "commander";
import { addCommand } from "./add";
import { agendaCommand } from "./agenda";
import { lsCommand } from "./ls";
import { nowCommand } from "./now";
import { nextCommand } from "./next";
import { editCommand } from "./edit";
import { doneCommand } from "./done";
import { rmCommand } from "./rm";

export const calendarCommand = new Command("cal")
  .description("Calendar management commands")
  .addCommand(addCommand)
  .addCommand(agendaCommand)
  .addCommand(lsCommand)
  .addCommand(nowCommand)
  .addCommand(nextCommand)
  .addCommand(editCommand)
  .addCommand(doneCommand)
  .addCommand(rmCommand);