import { Command } from "commander";
import chalk from "chalk";
import { z } from "zod";
import { resolvePath } from "../../lib/path-resolver";
import { an } from "../../lib/an";

export const cdCommand = new Command("cd")
  .description("Change directory to a named location (works with shell wrapper)")
  .argument("[name_or_query]", "Name or query to find directory (default: mono root)")
  .action(
    an(z.tuple([z.string()]).or(z.tuple([])), z.object({}), async (args) => {
      try {
        const nameOrQuery = args[0];

        // If no name/query provided, use mono root
        if (!nameOrQuery) {
          const config = await import("../../lib/config").then((m) => m.getConfig());
          console.log(config.monoDir);
          return;
        }

        // Try to resolve the path
        const resolvedPath = await resolvePath(nameOrQuery);

        if (resolvedPath) {
          // Output the path for the shell wrapper to use
          console.log(resolvedPath);
        } else {
          console.error(chalk.red(`Error: Could not find directory for '${nameOrQuery}'`));
          process.exit(1);
        }
      } catch (error) {
        console.error(
          chalk.red(
            `Error resolving directory: ${error instanceof Error ? error.message : String(error)}`
          )
        );
        process.exit(1);
      }
    })
  );

// Important note in help text
cdCommand.addHelpText(
  "after",
  `
Note: This command only works with a shell wrapper.
The wrapper should use the output path with the shell's built-in 'cd' command.

Example shell wrapper in .zprofile or .bashrc:
my() {
  if [ "$1" = "cd" ]; then
    cd $(bun ~/path/to/my/index.ts cd $2)
  else
    bun ~/path/to/my/index.ts "$@"
  fi
}
`
);
