import fs from "fs";
import path from "path";
import { spawn } from "child_process";

// Base directory for notes
const dir = "/Users/taylormitchell/Code/notes/notes/";

// Function to get today's date in YYYY-MM-DD format
function getTodayFilename(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const day = today.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}.md`;
}

// Function to get the full path to today's journal file
function getTodayFilePath(): string {
  const filename = getTodayFilename();
  return path.join(dir, filename);
}

// Type definitions
type TodoStatus = "done" | "doing" | "todo";

type TodoItem = {
  text: string;
  status: TodoStatus;
  section: string;
};

// Function to read and parse the Markdown file
function readMarkdownFile(filePath: string): TodoItem[] {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const lines = fileContent.split("\n");

    const todoItems: TodoItem[] = [];
    let currentSection = "";

    lines.forEach((line) => {
      // Check if line is a header
      if (line.trim().startsWith("#")) {
        currentSection = line.trim();
        return;
      }

      // Skip if not a task line
      if (!line.trim().startsWith("- ")) return;

      // Check for the different status markers
      if (line.includes("- [x]") || line.includes("- [X]")) {
        const text = line.replace(/- \[x\]/i, "").trim();
        todoItems.push({ text, status: "done", section: currentSection });
      } else if (line.toLowerCase().includes("- [doing]")) {
        const text = line.replace(/- \[doing\]/i, "").trim();
        todoItems.push({ text, status: "doing", section: currentSection });
      } else if (line.includes("- [ ]")) {
        const text = line.replace(/- \[ \]/, "").trim();
        todoItems.push({ text, status: "todo", section: currentSection });
      }
    });

    return todoItems;
  } catch (error) {
    console.error(`Error reading file: ${error.message}`);
    return [];
  }
}

// Function to list all todo items
function listItems(
  filterOptions: {
    hideDone?: boolean;
    onlyDoing?: boolean;
    onlyTodo?: boolean;
    onlyDone?: boolean;
    limit?: number;
  } = {}
): void {
  const filePath = getTodayFilePath();
  console.log(`Reading todo items from: ${filePath}`);

  let todoItems = readMarkdownFile(filePath);

  if (todoItems.length === 0) {
    console.log("No todo items found.");
    return;
  }

  // Apply filters
  if (filterOptions.hideDone) {
    todoItems = todoItems.filter((item) => item.status !== "done");
  }

  if (filterOptions.onlyDoing) {
    todoItems = todoItems.filter((item) => item.status === "doing");
  }

  if (filterOptions.onlyTodo) {
    todoItems = todoItems.filter((item) => item.status === "todo");
  }

  if (filterOptions.onlyDone) {
    todoItems = todoItems.filter((item) => item.status === "done");
  }

  if (todoItems.length === 0) {
    console.log("No todo items match the specified filters.");
    return;
  }

  // Separate todo items from the rest
  const todoEntries = todoItems.filter((item) => item.status === "todo");
  const nonTodoEntries = todoItems.filter((item) => item.status !== "todo");

  // Combine the lists with todos at the bottom
  let sortedItems = [...nonTodoEntries, ...todoEntries];

  // Apply limit if specified
  if (filterOptions.limit && filterOptions.limit > 0 && sortedItems.length > filterOptions.limit) {
    sortedItems = sortedItems.slice(0, filterOptions.limit);
    console.log(`Showing ${filterOptions.limit} of ${todoItems.length} total items`);
  }

  // Group items by section
  const sections = new Map<string, TodoItem[]>();

  sortedItems.forEach((item) => {
    if (!sections.has(item.section)) {
      sections.set(item.section, []);
    }
    sections.get(item.section)?.push(item);
  });

  // Display items grouped by section
  for (const [section, items] of sections.entries()) {
    if (section) {
      console.log(`\n${section}`);
    } else {
      console.log("\nUncategorized");
    }

    items.forEach((item) => {
      const statusIndicator = `[${item.status}] `;
      console.log(`- ${statusIndicator.padEnd(10, " ")}${item.text}`);
    });
  }
}

// Function to show current "doing" tasks
function showNowItems(limit?: number): void {
  const filePath = getTodayFilePath();
  const todoItems = readMarkdownFile(filePath);

  // Filter items with "doing" status
  let nowItems = todoItems.filter((item) => item.status === "doing");

  if (nowItems.length === 0) {
    console.log("No tasks currently in progress.");
    return;
  }

  // Apply limit if specified
  if (limit && limit > 0 && nowItems.length > limit) {
    nowItems = nowItems.slice(0, limit);
    console.log(
      `Showing ${limit} of ${
        todoItems.filter((item) => item.status === "doing").length
      } tasks in progress`
    );
  }

  console.log("Currently working on:");

  // Group by section
  const sections = new Map<string, TodoItem[]>();

  nowItems.forEach((item) => {
    if (!sections.has(item.section)) {
      sections.set(item.section, []);
    }
    sections.get(item.section)?.push(item);
  });

  // Display items grouped by section
  for (const [section, items] of sections.entries()) {
    if (section) {
      console.log(`\n${section}`);
    } else {
      console.log("\nUncategorized");
    }

    items.forEach((item) => {
      console.log(`- ${item.text}`);
    });
  }
}

// Main function to handle commands
async function main() {
  const command = process.argv[2] || "list";
  const options = process.argv.slice(3);

  // Parse limit option
  let limit: number | undefined;
  for (let i = 0; i < options.length - 1; i++) {
    if (options[i] === "-n" || options[i] === "--limit") {
      const limitValue = parseInt(options[i + 1]);
      if (!isNaN(limitValue)) {
        limit = limitValue;
      }
    }
  }

  switch (command) {
    case "open":
      if (process.env.TERM_PROGRAM === "vscode") {
        spawn("code", [getTodayFilePath()]);
      } else {
        spawn("vim", [getTodayFilePath()], { stdio: "inherit" });
      }
      break;
    case "file":
      console.log(getTodayFilePath());
      break;
    case "todo":
      listItems({ hideDone: true, limit });
      break;
    case "list":
      // Parse filter options
      const filterOptions = {
        hideDone: options.includes("--no-done"),
        onlyDoing: options.includes("--doing"),
        onlyTodo: options.includes("--todo"),
        onlyDone: options.includes("--done"),
        limit,
      };
      listItems(filterOptions);
      break;
    case "now":
      showNowItems(limit);
      break;
    default:
      console.log("Unknown command. Available commands: list, todo, now, open, file");
      console.log("List options: --no-done, --doing, --todo, --done");
      console.log("Limit number of items: -n <number> or --limit <number>");
  }
}

// Execute the main function
main();
