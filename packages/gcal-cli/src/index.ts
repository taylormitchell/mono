#!/usr/bin/env bun
import { Command } from "commander";
import { addCmd } from "./commands/add";
import { agendaCmd } from "./commands/agenda";
import { nowCmd } from "./commands/now";
// import { nextCmd } from "./commands/next";
// import { doneCmd } from "./commands/done";
// import { editCmd } from "./commands/edit";
// import { lsCmd } from "./commands/ls";
// import { rmCmd } from "./commands/rm";

const program = new Command()
  .name("gcal")
  .description("CLI for Google Calendar & Tasks")
  .version("0.1.0");

program.addCommand(addCmd());
program.addCommand(agendaCmd());
program.addCommand(nowCmd());
// program.addCommand(nextCmd());
// program.addCommand(editCmd());
// program.addCommand(doneCmd());
// program.addCommand(lsCmd());
// program.addCommand(rmCmd());

program.parseAsync();
