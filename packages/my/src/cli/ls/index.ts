import { Command } from "commander";
import chalk from "chalk";
import { z } from "zod";
import { formatPath } from "../../lib/utils";
import { resolvePath, listDirectories } from "../../lib/path-resolver";
import path from "node:path";
import fs from "node:fs";
import { an } from "../../lib/an";

export const lsCommand = new Command("ls")
  .description("List files/directories in a named location or based on a query")
  .argument("[path_or_query]", "Path or query to find directory (default: mono root)")
  .option("-l, --long", "Use a long listing format with additional details")
  .action(
    an(
      z.tuple([z.string()]).or(z.tuple([])),
      z.object({
        long: z.boolean().default(false),
      }),
      async (args, options) => {
        try {
          const pathOrQuery = args[0];

          // Get list of directories
          const directories = await listDirectories(pathOrQuery);

          if (directories.length === 0) {
            console.error(chalk.yellow(`No directories found for '${pathOrQuery || "mono root"}'`));
            process.exit(0);
          }

          // Sort alphabetically
          directories.sort();

          // Display directories
          if (options.long) {
            // Get formatting width for alignment
            const maxPathLength = Math.max(...directories.map((dir) => formatPath(dir).length));

            // Display with additional details
            for (const dir of directories) {
              try {
                const stats = fs.statSync(dir);
                const modified = stats.mtime.toISOString().slice(0, 10);
                const formattedPath = formatPath(dir).padEnd(maxPathLength);
                console.log(`${formattedPath}  ${modified}  ${path.basename(dir)}`);
              } catch (error) {
                // Skip if can't get stats
                console.log(formatPath(dir));
              }
            }
          } else {
            // Simple display, just the paths
            directories.forEach((dir) => console.log(formatPath(dir)));
          }
        } catch (error) {
          console.error(
            chalk.red(
              `Error listing directories: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      }
    )
  );
