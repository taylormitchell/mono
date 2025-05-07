import { Command } from "commander";
import { getConfig } from "../../lib/config";
import chalk from "chalk";
import { z } from "zod";
import { fn } from "../../lib/utils";
import path from "node:path";
import fs from "node:fs";

// Schema for named paths
const pathNameSchema = z.string();

export const pathCommand = new Command("path")
  .description("Get the full path of a folder")
  .argument("<name>", "Name of the folder")
  .action(
    fn(
      pathNameSchema,
      (name) => {
        try {
          const config = getConfig();
          
          // Check if it's the notes directory
          if (name === "notes") {
            console.log(config.notesDir);
            return;
          }

          // Check if it's the mono directory
          if (name === "mono") {
            console.log(config.monoDir);
            return;
          }

          // Get packages directory from mono directory
          const packagesDir = path.join(config.monoDir, "packages");
          
          // Check packages directory first
          const packagePath = path.join(packagesDir, name);
          if (fs.existsSync(packagePath) && fs.statSync(packagePath).isDirectory()) {
            console.log(packagePath);
            return;
          }

          // Check root directory (mono)
          const rootPath = path.join(config.monoDir, name);
          if (fs.existsSync(rootPath) && fs.statSync(rootPath).isDirectory()) {
            console.log(rootPath);
            return;
          }

          // Check notes directory
          const notesPath = path.join(config.notesDir, name);
          if (fs.existsSync(notesPath) && fs.statSync(notesPath).isDirectory()) {
            console.log(notesPath);
            return;
          }

          console.error(chalk.red(`Folder '${name}' not found`));
          process.exit(1);
        } catch (error) {
          console.error(
            chalk.red(
              `Error getting path: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      }
    )
  );