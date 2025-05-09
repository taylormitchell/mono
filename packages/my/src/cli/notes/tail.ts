import { Command } from "commander";
import { an } from "../../lib/an";
import { z } from "zod";
import chalk from "chalk";
import path from "node:path";
import fs from "node:fs";
import { getConfig } from "../../lib/config";
import { executeGit } from "../../lib/git";

export const tailCommand = new Command("tail")
  .description("Show recently modified notes")
  .argument("[n]", "Number of notes to show", "10")
  .action(
    an(z.tuple([z.string().optional()]), async (countStr) => {
      try {
        const config = getConfig();
        const notesDir = config.notesDir;

        if (!notesDir) {
          console.error(chalk.red("Notes directory not found in config"));
          process.exit(1);
        }

        const count = countStr ? parseInt(countStr) : 10;

        if (isNaN(count)) {
          console.error(chalk.red("Invalid number"));
          process.exit(1);
        }

        // Use git to find recently modified files
        const result = await executeGit(
          ["ls-files", "--modified", "--others", "--exclude-standard"],
          { cwd: notesDir }
        );

        if (!result.success) {
          console.error(chalk.red("Failed to list modified files"));
          process.exit(1);
        }

        const modifiedFiles = result.data.split("\n").filter(Boolean);

        // Use git log to find recently committed files
        const logResult = await executeGit(["log", "--name-only", "--format=", "-n", "30"], {
          cwd: notesDir,
        });

        let recentFiles = [...modifiedFiles];

        if (logResult.success) {
          const committedFiles = logResult.data
            .split("\n")
            .filter(Boolean)
            .filter((file) => file.endsWith(".md"));

          recentFiles = [...new Set([...recentFiles, ...committedFiles])];
        }

        // Filter to .md files and trim to requested count
        const mdFiles = recentFiles.filter((file) => file.endsWith(".md")).slice(0, count);

        if (mdFiles.length === 0) {
          console.log(chalk.yellow("No recently modified notes found"));
          return;
        }

        // Get file stats and sort by modification time
        const filesWithStats = mdFiles.map((file) => {
          const fullPath = path.join(notesDir, file);
          const stats = fs.existsSync(fullPath) ? fs.statSync(fullPath) : null;
          return {
            file,
            mtime: stats ? stats.mtime : new Date(0),
          };
        });

        filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

        // Display results
        console.log(
          chalk.yellow(`${Math.min(count, filesWithStats.length)} most recently modified notes:`)
        );

        filesWithStats.forEach(({ file, mtime }) => {
          console.log(`${chalk.green(file)} - ${mtime.toLocaleString()}`);
        });
      } catch (error) {
        console.error(
          chalk.red(
            `Error running notes tail: ${error instanceof Error ? error.message : String(error)}`
          )
        );
        process.exit(1);
      }
    })
  );
