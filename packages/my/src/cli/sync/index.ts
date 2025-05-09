import { Command } from "commander";
import { getConfig } from "../../lib/config";
import { syncRepo } from "../../integrations/git";
import chalk from "chalk";
import { z } from "zod";
import { an } from "../../lib/an";

export const syncCommand = new Command("sync")
  .description("Sync notes repository (pull then push)")
  .option("-v, --verbose", "Show detailed output")
  .action(
    an(z.tuple([z.object({ verbose: z.boolean().default(false) })]), async (options) => {
      try {
        const config = getConfig();
        const notesDir = config.notesDir;

        if (!notesDir) {
          console.error(chalk.red("Error: Notes directory not configured."));
          console.log(`Set it in ${chalk.cyan("~/.config/my/config.json")}`);
          process.exit(1);
        }

        console.log(chalk.blue(`Syncing notes repository at ${notesDir}...`));

        const result = await syncRepo(notesDir);

        if (options.verbose) {
          console.log(chalk.gray("Pull result:"), result.pull);
          console.log(chalk.gray("Push result:"), result.push);
        }

        console.log(chalk.green("✓ Sync completed successfully"));
      } catch (error) {
        console.error(
          chalk.red(`Error during sync: ${error instanceof Error ? error.message : String(error)}`)
        );
        process.exit(1);
      }
    })
  );
