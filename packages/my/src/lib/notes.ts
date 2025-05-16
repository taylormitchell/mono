import path from "path";
import fs from "fs";
import { toTimestampWithTimezone } from "./utils";

export function createNote(message: string, name?: string) {
  const config = getConfig();
  const notesDir = config.notesDir;
  name = name || `${toTimestampWithTimezone(new Date())}.md`;
  const filePath = path.join(notesDir, name);

  // Write the file with the provided message or empty content
  fs.writeFileSync(filePath, message || "");
}
