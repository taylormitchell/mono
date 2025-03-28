import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// Base directory for notes
const dir = "/Users/taylormitchell/Code/notes/notes/";

// Function to get today's date in YYYY-MM-DD format
function getTodayFilename(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}.jsonl`;
}

// Function to get the full path to today's journal file
function getTodayFilePath(): string {
  const filename = getTodayFilename();
  return path.join(dir, filename);
}

// Type definitions
type EntryMetadata = {
  start?: string;
  end?: string;
  status?: "done" | "doing" | "todo";
};

type JournalEntry = [string, EntryMetadata];

// Function to read and parse the JSONL file
function readJsonlFile(path: string): JournalEntry[] {
  try {
    const fileContent = fs.readFileSync(path, 'utf-8');
    const lines = fileContent.split('\n');

    const entries = lines.map(line => {
      if (line.trim() === '') return null;
      if (line.startsWith('//')) return null;
      try {
        return JSON.parse(line) as JournalEntry;
      } catch (e) {
        return null;
      }
    }).filter(Boolean) as JournalEntry[];

    return entries;

  } catch (error) {
    console.error(`Error reading file: ${error.message}`);
    return [];
  }
}

// Function to list all entries
function listEntries(filterOptions: {
  hideDone?: boolean,
  onlyDoing?: boolean,
  onlyTodo?: boolean,
  onlyDone?: boolean
} = {}): void {
  const filePath = getTodayFilePath();
  console.log(`Reading entries from: ${filePath}`);

  let entries = readJsonlFile(filePath);

  if (entries.length === 0) {
    console.log("No entries found.");
    return;
  }

  // Apply filters
  if (filterOptions.hideDone) {
    entries = entries.filter(entry => entry[1].status !== "done");
  }

  if (filterOptions.onlyDoing) {
    entries = entries.filter(entry => entry[1].status === "doing");
  }

  if (filterOptions.onlyTodo) {
    entries = entries.filter(entry => entry[1].status === "todo");
  }

  if (filterOptions.onlyDone) {
    entries = entries.filter(entry => entry[1].status === "done");
  }

  if (entries.length === 0) {
    console.log("No entries match the specified filters.");
    return;
  }

  // Separate todo entries from the rest
  const todoEntries = entries.filter(entry => entry[1].status === "todo");
  const nonTodoEntries = entries.filter(entry => entry[1].status !== "todo");

  // Sort non-todo entries by start time
  nonTodoEntries.sort((a, b) => {
    const startA = a[1].start ? new Date(a[1].start).getTime() : 0;
    const startB = b[1].start ? new Date(b[1].start).getTime() : 0;
    return startA - startB;
  });

  // Sort todo entries by start time
  todoEntries.sort((a, b) => {
    const startA = a[1].start ? new Date(a[1].start).getTime() : 0;
    const startB = b[1].start ? new Date(b[1].start).getTime() : 0;
    return startA - startB;
  });

  // Combine the lists with todos at the bottom
  const sortedEntries = [...nonTodoEntries, ...todoEntries];

  // Display entries
  sortedEntries.forEach(entry => {
    const [text, metadata] = entry;
    let timePrefix = "";

    if (metadata.start) {
      const startTime = new Date(metadata.start);
      const startHour = startTime.getHours();
      const startMinute = startTime.getMinutes().toString().padStart(2, '0');

      if (metadata.end) {
        const endTime = new Date(metadata.end);
        const endHour = endTime.getHours();
        const endMinute = endTime.getMinutes().toString().padStart(2, '0');
        timePrefix = `${startHour}:${startMinute}-${endHour}:${endMinute}`;
      } else {
        timePrefix = `${startHour}:${startMinute}`;
      }
    }

    // Add padding to ensure all descriptions start at the same column
    const paddedTimePrefix = timePrefix ? timePrefix.padEnd(10, ' ') + ' ' : '           ';
    const statusIndicator = metadata.status ? `[${metadata.status}] ` : '';
    console.log(`- ${paddedTimePrefix}${statusIndicator}${text}`);
  });
}

// Function to show current "doing" tasks
function showNowEntries(): void {
  const filePath = getTodayFilePath();
  const entries = readJsonlFile(filePath);

  // Filter entries with "doing" status
  const nowEntries = entries.filter(entry => entry[1].status === "doing");

  if (nowEntries.length === 0) {
    console.log("No tasks currently in progress.");
    return;
  }

  console.log("Currently working on:");
  nowEntries.forEach(entry => {
    const [text, metadata] = entry;
    let timePrefix = "";

    if (metadata.start) {
      const startTime = new Date(metadata.start);
      const startHour = startTime.getHours();
      const startMinute = startTime.getMinutes().toString().padStart(2, '0');
      timePrefix = `${startHour}:${startMinute}`;

      // Calculate duration if started
      const now = new Date();
      const durationMinutes = Math.floor((now.getTime() - startTime.getTime()) / 60000);
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;

      if (hours > 0) {
        timePrefix += ` (${hours}h ${minutes}m)`;
      } else {
        timePrefix += ` (${minutes}m)`;
      }
    }

    const paddedTimePrefix = timePrefix ? timePrefix.padEnd(15, ' ') + ' ' : '                ';
    console.log(`- ${paddedTimePrefix}${text}`);
  });
}

// Main function to handle commands
async function main() {
  const command = process.argv[2] || 'list';
  const options = process.argv.slice(3);

  switch (command) {
    case 'open':
      if (process.env.TERM_PROGRAM === 'vscode') {
        spawn('code', [getTodayFilePath()]);
      } else {
        spawn('vim', [getTodayFilePath()], { stdio: 'inherit' });
      }
      break;
    case 'file':
      console.log(getTodayFilePath());
      break;
    case 'todo':
      listEntries({ hideDone: true });
      break;
    case 'list':
      // Parse filter options
      const filterOptions = {
        hideDone: options.includes('--no-done'),
        onlyDoing: options.includes('--doing'),
        onlyTodo: options.includes('--todo'),
        onlyDone: options.includes('--done')
      };
      listEntries(filterOptions);
      break;
    case 'now':
      showNowEntries();
      break;
    default:
      console.log("Unknown command. Available commands: list, now");
      console.log("List options: --no-done, --doing, --todo, --done");
  }
}

// Execute the main function
main();

