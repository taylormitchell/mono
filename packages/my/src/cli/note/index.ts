import { Command } from "commander";
import { z } from "zod";
import chalk from "chalk";
import path from "node:path";
import fs from "node:fs";
import { toTimestampWithTimezone, ensureDir } from "../../lib/utils";
import { getConfig } from "../../lib/config";
import { an } from "../../lib/an";

export const noteCommand = new Command("note")
  .description("Commands for managing notes")
  .addCommand(
    new Command("create")
      .description("Create a new markdown note")
      .argument("[filename]", "Name of the note file (optional)")
      .option("-m, --message <message>", "Initial content of the note")
      .action(
        an(
          z.tuple([z.string().optional(), z.object({ message: z.string().optional() })]),
          (filename, options) => {
            try {
              const config = getConfig();
              const notesDir = config.notesDir;

              if (!notesDir) {
                console.error(chalk.red("Notes directory not found in config"));
                process.exit(1);
              }

              // Create notes directory if it doesn't exist
              ensureDir(notesDir);

              // Generate filename if not provided
              let noteFilename = filename || `${toTimestampWithTimezone(new Date())}.md`;
              noteFilename = noteFilename.endsWith(".md") ? noteFilename : `${noteFilename}.md`;

              // Create the full file path
              const filePath = path.join(notesDir, noteFilename);

              // Write the file with the provided message or empty content
              fs.writeFileSync(filePath, options.message || "");

              // Output the file path for the shell wrapper to use
              console.log(filePath);
            } catch (error) {
              console.error(
                chalk.red(
                  `Error creating note: ${error instanceof Error ? error.message : String(error)}`
                )
              );
              process.exit(1);
            }
          }
        )
      )
  );
