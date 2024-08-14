import { Command } from "commander";
import chalk from "chalk";
import { listAllTodos, listTodosDueToday } from "./core";
chalk.level = 3;

// let rootDir = __dirname;
// while (!fs.existsSync(path.join(rootDir, "package.json"))) {
//   rootDir = path.dirname(rootDir);
// }

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
    listTodosDueToday(parseInt(offset));
  });

program.parse(process.argv);
// listAllTodos(
//   "/Users/taylormitchell/Code/taylors-tech/packages/notes/journals/2024/august/week-of-12.md"
// );
