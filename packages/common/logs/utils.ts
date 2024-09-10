import fs from "fs";
import path from "path";
import { getRootDir } from "../data";
import { LogEntry } from "./types";
import { format } from "date-fns";

export function addLogEntry(logEntry: LogEntry): string {
  const logPath = path.join(getRootDir(), "log.jsonl");
  const logLine =
    JSON.stringify({
      ...logEntry,
      datetime: format(logEntry.datetime, "yyyy-MM-dd'T'HH:mm:ssxxx"),
    }) + "\n";
  fs.appendFileSync(logPath, logLine);
  return logPath;
}

export function getTodayLogEvents(): LogEntry[] {
  const logPath = path.join(getRootDir(), "log.jsonl");
  const today = new Date().toISOString().split("T")[0];
  return fs
    .readFileSync(logPath, "utf-8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line))
    .filter((entry) => entry.datetime.startsWith(today));
}
