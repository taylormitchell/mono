import fs from "fs";
import path from "path";
import type { Todo, TodoFileContents } from "../schemas/todo";
import { TodoFileContentsSchema } from "../schemas/todo";
import { nanoid } from "nanoid";

/**
 * Get all todo files in the specified directory and its subdirectories
 */
export function getTodoFiles(
  directory: string = process.cwd(),
  { maxDepth = 10 }: { maxDepth?: number } = {}
): string[] {
  try {
    const allFiles: string[] = [];
    function scanDirectory(dir: string, depth = 0) {
      if (depth > maxDepth) {
        return;
      }
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          scanDirectory(fullPath, depth + 1);
        } else if (stats.isFile() && file.endsWith(".todo.json")) {
          allFiles.push(fullPath);
        }
      }
    }
    scanDirectory(directory);
    return allFiles;
  } catch (error) {
    console.error(
      `Error reading directory: ${error instanceof Error ? error.message : String(error)}`
    );
    return [];
  }
}

/**
 * Write a todo to a file
 */
export function writeTodoFile(
  todo: TodoFileContents,
  filePathOrDir: string = process.cwd()
): string {
  const filePath = fs.statSync(filePathOrDir).isDirectory()
    ? path.join(filePathOrDir, `${nanoid()}.todo.json`)
    : filePathOrDir;
  if (!filePath.endsWith(".todo.json")) {
    throw new Error("File path must end with .todo.json");
  }
  fs.writeFileSync(filePath, JSON.stringify(todo, null, 2));
  return filePath;
}

export function readTodoFile(filePath: string): Todo {
  return {
    ...TodoFileContentsSchema.parse(JSON.parse(fs.readFileSync(filePath, "utf-8"))),
    filePath,
  };
}

/**
 * Delete a todo file
 */
export function deleteTodoFile(todoId: string, directory: string = process.cwd()): boolean {
  try {
    const filePath = path.join(directory, `${todoId}.json`);

    if (!fs.existsSync(filePath)) {
      console.error(`Todo file not found: ${filePath}`);
      return false;
    }

    fs.unlinkSync(filePath);
    return true;
  } catch (error) {
    console.error(
      `Error deleting todo file: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

/**
 * Get all todos in the specified directory
 */
export function getAllTodos(
  directory: string = process.cwd(),
  { maxDepth = 10 }: { maxDepth?: number } = {}
): Todo[] {
  const todoFiles = getTodoFiles(directory, { maxDepth });
  const todos: Todo[] = [];

  for (const filePath of todoFiles) {
    try {
      const todo = readTodoFile(filePath);
      todos.push(todo);
    } catch (error) {
      console.error(
        `Error parsing todo at ${filePath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return todos;
}
