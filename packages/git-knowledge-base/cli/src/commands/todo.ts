import fs from "fs";
import path from "path";
import chalk from "chalk";
import { v4 as uuidv4 } from "uuid";

// Define the Todo type
interface Todo {
  type: "todo";
  description: string;
  createdAt: string;
  completedAt?: string;
  dueDate?: string;
}

/**
 * List all todos in the current directory
 */
export async function listTodos(): Promise<boolean> {
  try {
    const files = fs.readdirSync(process.cwd());
    const todoFiles = files.filter((file) => {
      // Check if the file is a JSON file
      if (!file.endsWith(".json")) return false;

      try {
        const content = fs.readFileSync(path.join(process.cwd(), file), "utf-8");
        const data = JSON.parse(content);
        return data.type === "todo";
      } catch (error) {
        return false;
      }
    });

    if (todoFiles.length === 0) {
      console.log("No todos found.");
      return true;
    }

    console.log(chalk.bold("\nTodos:"));

    // Read and display each todo
    for (const file of todoFiles) {
      const content = fs.readFileSync(path.join(process.cwd(), file), "utf-8");
      const todo = JSON.parse(content) as Todo;

      const status = todo.completedAt ? chalk.green("✓") : chalk.yellow("○");
      const description = todo.description;
      const dueInfo = todo.dueDate ? chalk.blue(` (Due: ${todo.dueDate})`) : "";

      console.log(`${status} ${description}${dueInfo} [${path.basename(file, ".json")}]`);
    }

    return true;
  } catch (error) {
    console.error(`Error listing todos: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Create a new todo
 */
export async function createTodo(description: string): Promise<boolean> {
  try {
    // Generate a UUID for the new todo
    const id = uuidv4().toUpperCase();
    const filename = `${id}.json`;

    // Create the todo object
    const todo: Todo = {
      type: "todo",
      description,
      createdAt: new Date().toISOString(),
    };

    // Write the todo to a file
    fs.writeFileSync(path.join(process.cwd(), filename), JSON.stringify(todo, null, 2));

    console.log(chalk.green(`Todo created: ${description}`));
    console.log(`File: ${filename}`);

    return true;
  } catch (error) {
    console.error(`Error creating todo: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}
