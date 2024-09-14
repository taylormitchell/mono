import { Command } from "commander";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import { getTodos, groupBy, listTodosDueToday } from "@taylor/common/todo/parsers";
import { getRootDir } from "@taylor/common/data";
import { Todo } from "@taylor/common/todo/types";
chalk.level = 3;

const program = new Command();

program.version("1.0.0").description("A CLI tool for managing todos in markdown files");

function renderByFile(todos: Todo[]) {
  const todosByFile = groupBy(todos, "filename");
  todosByFile.forEach((todos, filename) => {
    const relativeFilename = path.relative(getRootDir(), filename);
    console.log(chalk.cyan(`File: ${relativeFilename}`));
    console.log(chalk.cyan("=".repeat(relativeFilename.length + 6)));
    todos.forEach((todo) => {
      console.log(
        chalk.bold(`  ${todo.status}: ${todo.text}`),
        todo.due ? chalk.green(`Due: ${todo.due.toISOString().split("T")[0]}`) : ""
      );
    });
  });
}

program
  .command("list [path]")
  .description("List all todos")
  .action((path) => {
    const todos = getTodos(path).filter((todo) => todo.status === "TODO");
    renderByFile(todos);
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
