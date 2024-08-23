import { Command } from "commander";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import { getRootDir, listAllTodos, listTodosDueToday } from "./core";
chalk.level = 3;

const program = new Command();

program.version("1.0.0").description("A CLI tool for managing todos in markdown files");

program
  .command("list [path]")
  .description("List all todos")
  .action((path = process.cwd()) => {
    listAllTodos(path);
  });

program
  .command("due [offset]")
  .description("List todos due today")
  .option("-i, --ignore-today", "Ignore todos from today's daily page")
  .action((offset = 0, options) => {
    listTodosDueToday(getRootDir(), parseInt(offset), options.ignoreToday);
  });

// add a line to the top of the /gtd/someday-maybe.md file
program
  .command("sm [line]")
  .description("Add a line to the top of the /gtd/someday-maybe.md file")
  .action((line) => {
    const filename = path.join(getRootDir(), "gtd", "someday-maybe.md");
    fs.appendFileSync(filename, "\n" + line);
  });

// add a todo to the bottom of the /gtd/todo.md file
program
  .command("todo [line]")
  .description("Add a todo to the bottom of the /gtd/todo.md file")
  .action((line) => {
    const filename = path.join(getRootDir(), "gtd", "todo.md");
    fs.appendFileSync(filename, "\nTODO " + line);
  });

program.parse(process.argv);
