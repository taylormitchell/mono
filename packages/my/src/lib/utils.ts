import fs from "fs";
import path from "path";
import os from "os";
import { ZodSchema, z } from "zod";

/**
 * Check if a path exists
 */
export function pathExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Ensure a directory exists, create it if it doesn't
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Get current date in YYYY-MM-DD format
 */
export function getFormattedDate(date?: Date): string {
  const d = date || new Date();
  return d.toISOString().split("T")[0];
}

/**
 * Format a path for display or use
 * Replaces home directory with ~
 */
export function formatPath(filePath: string): string {
  const home = os.homedir();
  if (filePath.startsWith(home)) {
    return path.join("~", filePath.slice(home.length));
  }
  return filePath;
}

/**
 * Expand ~ in path to home directory
 */
export function expandPath(filePath: string): string {
  if (filePath.startsWith("~")) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

/**
 * Print a message to stdout
 */
export function printMessage(message: string): void {
  console.log(message);
}

/**
 * Print an error message to stderr
 */
export function printError(message: string): void {
  console.error(message);
}

/**
 * Get date with offset
 * @param offset Number of days to offset (positive or negative)
 */
export function getDateWithOffset(offset: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date;
}

/**
 * Parse date string or return offset date
 * If input is a number, treats it as an offset
 * If input is a date string, parses it
 * Otherwise returns current date
 */
export function parseDate(input?: string | number): Date {
  if (input === undefined) {
    return new Date();
  }

  if (typeof input === "number") {
    return getDateWithOffset(input);
  }

  const date = new Date(input);
  return isNaN(date.getTime()) ? new Date() : date;
}

/**
 * Create a function that parses input with a Zod schema and calls a callback with the parsed result
 */
export function fn<
  ArgSchema extends ZodSchema,
  Callback extends (arg1: z.output<ArgSchema>) => any
>(arg: ArgSchema, cb: Callback) {
  return (input: z.input<ArgSchema>): ReturnType<Callback> => {
    const parsed = arg.parse(input);
    return cb.apply(cb, [parsed]);
  };
}
/**
 * Returns a timestamp with the current timezone offset
 * Example: "2024-01-20-15-30-45-0400"
 */
export const toTimestampWithTimezone = (date: Date): string => {
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
