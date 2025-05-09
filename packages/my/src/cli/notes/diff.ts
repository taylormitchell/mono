import { Command } from "commander";
import { an } from "../../lib/an";
import { z } from "zod";
import chalk from "chalk";
import { getConfig } from "../../lib/config";
import { executeGit } from "../../lib/git";

export const diffCommand = new Command("diff")
  .description("Show git diff analysis of recent note changes")
  .argument("[days]", "Number of days to look back", "1")
  .action(
    an(
      z.tuple([
        z
          .string()
          .default("1")
          .transform((s) => parseInt(s)),
      ]),
      async (days) => {
        try {
          const config = getConfig();
          const notesDir = config.notesDir;

          if (!notesDir) {
            console.error(chalk.red("Notes directory not found in config"));
            process.exit(1);
          }

          // Show summary of changes
          const result = await executeGit([`diff HEAD@{${days}.day.ago}`], {
            cwd: notesDir,
          });

          console.log(chalk.yellow(`Changes in the last ${days} day(s):`));
          console.log(result.success ? result.data : chalk.red("Failed to execute git diff"));
        } catch (error) {
          console.error(
            chalk.red(
              `Error running notes diff: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      }
    )
  );
