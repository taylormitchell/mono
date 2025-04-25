import { Command } from "commander";
import fs from "fs";
import path from "path";
import os from "os";
import { z } from "zod";
import { $ } from "bun";

/**
 * Returns a timestamp with the current timezone offset
 * Example: "2024-01-20-15-30-45-0400"
 */
const toTimestampWithTimezone = (date: Date): string => {
  const timezoneOffset = -date.getTimezoneOffset();
  const sign = timezoneOffset >= 0 ? "+" : "-";
  const pad = (num: number) => String(Math.floor(Math.abs(num))).padStart(2, "0");
  const hours = pad(timezoneOffset / 60);
  const minutes = pad(timezoneOffset % 60);

  // Get local date/time components
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}-${hour}-${minute}-${second}${sign}${hours}${minutes}`;
};

// Load config
const CONFIG_FILE = path.join(os.homedir(), ".myrc.json");
const configSchema = z.object({
  rootDir: z.string(),
  defaultEditor: z.string().default("cursor"),
  notesDir: z.string().default(path.join(os.homedir(), "Code/notes/notes")),
});
if (!fs.existsSync(CONFIG_FILE)) {
  throw new Error(`No config file at: ${CONFIG_FILE}`);
}
const data = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
const parsed = configSchema.safeParse(data);
if (!parsed.success) {
  throw new Error(`Invalid config: ${parsed.error}`);
}
const config = parsed.data;
const scriptsDir = path.join(config.rootDir, "scripts");
const packagesDir = path.join(config.rootDir, "packages");

// Create a new Command instance
const program = new Command();

program.name("my").description("CLI tool for managing a personal monorepo");

program
  .command("script")
  .description("Create a new script file")
  .argument(
    "<type>",
    `Type of script to create
    Examples:
    - my script js -> 2025-03-23-15-48-35-0400.js
    - my script sh -> 2025-03-23-15-48-35-0400.sh
    `
  )
  .action((type: string) => {
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
      console.log(`Created scripts directory at ${scriptsDir}`);
    }
    const filename = `${toTimestampWithTimezone(new Date())}.${type}`;
    const filePath = path.join(scriptsDir, filename);
    fs.writeFileSync(filePath, "");
    console.log(filePath);
  });

program
  .command("note")
  .description("Create a new markdown note")
  .argument("[filename]", "Name of the note file (optional)")
  .option("-m, --message <message>", "Initial content of the note")
  .action((filename?: string, options: { message?: string } = {}) => {
    const notesDir = config.notesDir;
    if (!fs.existsSync(notesDir)) {
      fs.mkdirSync(notesDir, { recursive: true });
    }
    const noteFilename = filename || `${toTimestampWithTimezone(new Date())}.md`;
    const filePath = path.join(notesDir, noteFilename);
    fs.writeFileSync(filePath, options.message || "");
    console.log(filePath);
  });

program
  .command("root")
  .description("Print the my repo root directory")
  .action(() => {
    console.log(config.rootDir);
  });

program
  .command("packages")
  .description("Commands for managing packages")
  .addCommand(
    new Command("ls").description("List all packages in the my repo").action(async () => {
      fs.readdirSync(packagesDir)
        .filter((dir) => fs.statSync(path.join(packagesDir, dir)).isDirectory())
        .forEach((dir) => console.log(dir));
    })
  );

program
  .command("list")
  .description("List all packages in the my repo")
  .action(async () => {
    fs.readdirSync(packagesDir)
      .filter((dir) => fs.statSync(path.join(packagesDir, dir)).isDirectory())
      .forEach((dir) => console.log(dir));
  });

program
  .command("path")
  .description("Get the full path of a package")
  .argument("<name>", "Name of the package")
  .action((name: string) => {
    const packagePath = path.join(packagesDir, name);
    if (!fs.existsSync(packagePath)) {
      console.error(`Package '${name}' not found`);
      process.exit(1);
    }
    console.log(packagePath);
  });

// Parse command line arguments
program.parse(process.argv);
