import { Command } from "commander";
import { z } from "zod";
import chalk from "chalk";
import path from "node:path";
import fs from "node:fs";
import { fn, toTimestampWithTimezone, ensureDir } from "../../lib/utils";
import { getConfig } from "../../lib/config";
import { ZodSchema } from "zod";

// Schema for note create command
// Matches:
// [filename]
// [filename] [message]
// [message]
const noteCreateSchema = z.array(
  z.string().optional(),
  z.object({
    message: z.string().optional(),
  })
);

export function an<
  ArgSchema extends ZodSchema,
  Callback extends (arg1: z.output<ArgSchema>) => any
>(arg: ArgSchema, cb: Callback) {
  return (input: z.input<ArgSchema>): ReturnType<Callback> => {
    try {
      const inputWithoutCommand = input.slice(input.length - 1);
      const parsed = arg.parse(inputWithoutCommand);
      return cb.apply(cb, [parsed]);
    } catch (error) {
      console.error("Error parsing input:", input);
      console.error(error);
      throw error;
    }
  };
}

export const noteCommand = new Command("note")
  .description("Commands for managing notes")
  .addCommand(
    new Command("create")
      .description("Create a new markdown note")
      // .argument("[filename]", "Name of the note file (optional)")
      .option("-m, --message <message>", "Initial content of the note")
      .action(
        (...args) => {
          console.log("args.length", args.length);
          console.log(args);
        }
        // fn(
        //   noteCreateSchema,
        //   (options) => {
        //     try {
        //       const config = getConfig();
        //       const notesDir = config.notesDir;

        //       if (!notesDir) {
        //         console.error(chalk.red("Notes directory not found in config"));
        //         process.exit(1);
        //       }

        //       // Create notes directory if it doesn't exist
        //       ensureDir(notesDir);

        //       // Generate filename if not provided
        //       const noteFilename = options.filename || `${toTimestampWithTimezone(new Date())}.md`;

        //       // Make sure the filename ends with .md
        //       const filename = noteFilename.endsWith(".md") ? noteFilename : `${noteFilename}.md`;

        //       // Create the full file path
        //       const filePath = path.join(notesDir, filename);

        //       // Write the file with the provided message or empty content
        //       fs.writeFileSync(filePath, options.message || "");

        //       // Output the file path for the shell wrapper to use
        //       console.log(filePath);
        //     } catch (error) {
        //       console.error(
        //         chalk.red(
        //           `Error creating note: ${error instanceof Error ? error.message : String(error)}`
        //         )
        //       );
        //       process.exit(1);
        //     }
        //   }
        // )
      )
  );
