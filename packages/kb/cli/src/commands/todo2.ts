import chalk from "chalk";
import { createTodoFileContents } from "../schemas/todo";
import { getAllTodos, writeTodoFile, readTodoFile } from "../utils/todoFileUtils";
import { filterTodos, sortTodos, parseFilterString } from "../utils/todoFilterUtils";
import fs from "fs";
import path from "path";

/**
 * List all todos in the current directory
 */
export async function listTodos(
  options: {
    filter?: string;
    sort?: "dueDate" | "createdAt" | "completedAt" | "priority" | "description";
    direction?: "asc" | "desc";
    directory?: string;
  } = {}
): Promise<boolean> {
  const directory = options.directory || process.cwd();
  try {
    // Get all todos
    let todos = getAllTodos(directory);

    // Apply filters if provided
    if (options.filter) {
      const filterOptions = parseFilterString(options.filter);
      todos = filterTodos(todos, filterOptions);
    }

    // Apply sorting if provided
    if (options.sort) {
      todos = sortTodos(todos, options.sort, options.direction || "desc");
    }

    if (todos.length === 0) {
      console.log("No todos found.");
      return true;
    }

    // Display each todo
    for (const todo of todos) {
      const status = todo.completedAt ? chalk.green("✓") : chalk.yellow("○");
      const description = todo.description;
      const dueInfo = todo.dueDate ? chalk.blue(` (Due: ${todo.dueDate})`) : "";
      const priorityColor = todo.priority
        ? todo.priority === "high"
          ? chalk.red
          : todo.priority === "medium"
          ? chalk.yellow
          : chalk.gray
        : (text: string) => text;

      const priorityInfo = todo.priority ? ` [${priorityColor(todo.priority)}]` : "";
      const tagsInfo = todo.tags?.length ? chalk.cyan(` #${todo.tags.join(" #")}`) : "";

      const relativePath = path.relative(process.cwd(), todo.filePath);
      console.log(`${status} ${description}${dueInfo}${priorityInfo}${tagsInfo} [${relativePath}]`);
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
export async function createTodo(
  description: string,
  options: {
    dueDate?: string;
    priority?: "low" | "medium" | "high";
    tags?: string[];
    notes?: string;
    fileOrDirectory?: string;
  } = {}
): Promise<boolean> {
  try {
    const todo = createTodoFileContents(description, options);
    const filePath = writeTodoFile(todo, options.fileOrDirectory || process.cwd());
    console.log(path.relative(process.cwd(), filePath));
    return true;
  } catch (error) {
    console.error(`Error creating todo: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Complete a todo
 */
export async function completeTodo(filePath: string): Promise<boolean> {
  try {
    const todo = readTodoFile(filePath);

    if (!todo) {
      console.error(`Todo file ${filePath} not found.`);
      return false;
    }

    if (todo.completedAt) {
      todo.completedAt = undefined;
      console.log(chalk.yellow(`Todo marked as incomplete: ${todo.description}`));
    } else {
      todo.completedAt = new Date().toISOString();
      console.log(chalk.green(`Todo completed: ${todo.description}`));
    }
    writeTodoFile(todo, filePath);
    return true;
  } catch (error) {
    console.error(
      `Error completing todo: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

/**
 * Delete a todo
 */
export async function deleteTodo(filePaths: string[]): Promise<boolean> {
  try {
    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) {
        console.error(`Todo file not found: ${filePath}`);
        return false;
      }
      const todo = readTodoFile(filePath);
      fs.unlinkSync(filePath);
      console.log(`Todo deleted: ${todo.description}`);
    }
    return true;
  } catch (error) {
    console.error(`Error deleting todo: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Edit a todo
 */
export async function editTodo(
  id: string,
  updates: {
    description?: string;
    dueDate?: string;
    priority?: "low" | "medium" | "high";
    tags?: string[];
    notes?: string;
  }
): Promise<boolean> {
  try {
    const todos = getAllTodos();
    const todo = todos.find((t) => t.id === id);

    if (!todo) {
      console.error(`Todo with ID ${id} not found.`);
      return false;
    }

    // Apply updates
    if (updates.description) {
      todo.description = updates.description;
    }

    if (updates.dueDate !== undefined) {
      todo.dueDate = updates.dueDate || undefined;
    }

    if (updates.priority !== undefined) {
      todo.priority = updates.priority || undefined;
    }

    if (updates.tags !== undefined) {
      todo.tags = updates.tags.length > 0 ? updates.tags : undefined;
    }

    const success = writeTodoFile(todo);

    if (success) {
      console.log(chalk.green(`Todo updated: ${todo.description}`));
    }

    return success;
  } catch (error) {
    console.error(`Error editing todo: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}
