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
const CONFIG_FILE = path.join(os.homedir(), ".monorc.json");
const configSchema = z.object({
  rootDir: z.string(),
  defaultEditor: z.string().default("cursor"),
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

// Create a new Command instance
const program = new Command();

program.name("mono").description("CLI tool for managing a personal monorepo");

program
  .command("script")
  .description("Create a new script file")
  .argument(
    "<type>",
    `Type of script to create
    Examples:
    - mono script js -> 2025-03-23-15-48-35-0400.js
    - mono script sh -> 2025-03-23-15-48-35-0400.sh
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
    console.log(`Created ${filePath}`);
    $`${config.defaultEditor} ${filePath}`;
  });

// Parse command line arguments
program.parse(process.argv);
