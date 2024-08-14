import { Command } from "commander";
import chalk from "chalk";
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
  .action((offset = 0) => {
    listTodosDueToday(getRootDir(), parseInt(offset));
  });

program.parse(process.argv);
