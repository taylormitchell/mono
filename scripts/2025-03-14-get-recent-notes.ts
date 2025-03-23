import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// Configuration
const REPO_PATH = "/Users/taylormitchell/Code/notes";
const OUTPUT_PATH = "/tmp/recent-notes.md";
const DAYS_BACK = 30;

interface FileInfo {
  path: string;
  lastUpdated: Date;
  content: string;
}

// Get the date from X days ago in ISO format
const getDateXDaysAgo = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0];
};

// Get files modified since the specified date using git
const getRecentlyModifiedFiles = (): FileInfo[] => {
  const sinceDate = getDateXDaysAgo(DAYS_BACK);

  // Change to the repository directory
  process.chdir(REPO_PATH);

  // Get list of files modified since the date
  const gitCommand = `git log --since="${sinceDate}" --name-only --format="%ad,%H" --date=iso`;
  const output = execSync(gitCommand).toString();

  // Parse the output to get files with their last updated dates
  const lines = output.split("\n");
  const fileMap = new Map<string, Date>();

  let currentDate: Date | null = null;

  for (const line of lines) {
    if (line.includes(",")) {
      // This is a date line
      const datePart = line.split(",")[0];
      currentDate = new Date(datePart);
    } else if (line.trim() && currentDate) {
      // This is a file path
      const filePath = line.trim();

      // Only process markdown files
      if (!filePath.endsWith(".md")) continue;

      // Only update the date if it's newer than what we already have
      if (!fileMap.has(filePath) || currentDate > fileMap.get(filePath)!) {
        fileMap.set(filePath, currentDate);
      }
    }
  }

  // Filter out files that don't exist anymore and create FileInfo objects
  const fileInfos: FileInfo[] = [];

  for (const [filePath, lastUpdated] of fileMap.entries()) {
    const fullPath = path.join(REPO_PATH, filePath);

    if (fs.existsSync(fullPath) && !fs.statSync(fullPath).isDirectory()) {
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        fileInfos.push({
          path: filePath,
          lastUpdated,
          content,
        });
      } catch (error) {
        console.error(`Error reading file ${fullPath}:`, error);
      }
    }
  }

  // Sort by last updated date (newest first)
  return fileInfos.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
};

// Format the output
const formatOutput = (fileInfos: FileInfo[]): string => {
  let output = "# Recently Updated Notes\n\n";

  for (const fileInfo of fileInfos) {
    const dateStr = fileInfo.lastUpdated.toISOString().split("T")[0];

    output += `## ${fileInfo.path}\n`;
    output += `*Last updated: ${dateStr}*\n\n`;
    output += "```markdown\n";
    output += fileInfo.content;
    output += "\n```\n\n";
    output += "---\n\n";
  }

  return output;
};

// Main function
const main = () => {
  try {
    console.log(`Finding files modified in the last ${DAYS_BACK} days...`);
    const fileInfos = getRecentlyModifiedFiles();
    console.log(`Found ${fileInfos.length} modified files.`);

    const output = formatOutput(fileInfos);
    fs.writeFileSync(OUTPUT_PATH, output);

    console.log(`Output written to ${OUTPUT_PATH}`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

main();
