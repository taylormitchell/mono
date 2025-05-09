import { Command } from "commander";
import { getConfig } from "../../lib/config";
import chalk from "chalk";
import { z } from "zod";
import { toTimestampWithTimezone } from "../../lib/utils";
import path from "node:path";
import fs from "node:fs";
import { an } from "../../lib/an";

export const scriptCommand = new Command("script")
  .description("Create a new script file")
  .argument(
    "<type>",
    `Type of script to create
    Examples:
    - my script js -> 2025-03-23-15-48-35-0400.js
    - my script sh -> 2025-03-23-15-48-35-0400.sh
    `
  )
  .action(
    an(z.tuple([z.string()]), (type) => {
      try {
        const config = getConfig();

        // Use mono directory to create scripts directory
        const scriptsDir = path.join(config.monoDir, "scripts");

        // Create scripts directory if it doesn't exist
        if (!fs.existsSync(scriptsDir)) {
          fs.mkdirSync(scriptsDir, { recursive: true });
        }

        // Generate filename with timestamp
        const filename = `${toTimestampWithTimezone(new Date())}.${type}`;
        const filePath = path.join(scriptsDir, filename);

        // Create empty file
        fs.writeFileSync(filePath, "");

        // Output the path for the shell wrapper
        console.log(filePath);
      } catch (error) {
        console.error(
          chalk.red(
            `Error creating script: ${error instanceof Error ? error.message : String(error)}`
          )
        );
        process.exit(1);
      }
    })
  );
