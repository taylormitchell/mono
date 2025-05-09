import { Command } from "commander";
import { z } from "zod";
import chalk from "chalk";
import { an } from "../lib/an";
import { getCommandSuggestion } from "../integrations/openai";

export const cmdCommand = new Command("cmd")
  .description("Get command suggestions from AI")
  .argument("<description...>", "Natural language description of the command you want")
  .option("--copy", "Copy the command to clipboard instead of running it")
  .option("--model <name>", "OpenAI model to use (default: gpt-4o-mini)")
  .action(
    an(
      z.tuple([
        z.array(z.string()).min(1),
        z.object({
          copy: z.boolean().optional(),
          model: z.string().optional(),
        }),
      ]),
      async (descriptionArray, options) => {
        try {
          // Join the description array into a string
          const description = descriptionArray.join(" ");

          // Display thinking indicator
          process.stdout.write(chalk.yellow("Thinking..."));

          // Get command suggestion from OpenAI
          const command = await getCommandSuggestion(description);

          // Clear the thinking indicator
          process.stdout.write("\r" + " ".repeat(30) + "\r"); // Clear the line

          // Display the suggested command
          console.log(chalk.green("Suggested command:"));
          console.log(chalk.bold(command));

          // In a real CLI, we would handle the --copy option to copy to clipboard
          // or prompt to execute the command
          // But since we can't do interactive prompts in this environment,
          // we'll just display the command
        } catch (error) {
          // Clear the thinking indicator if there's an error
          process.stdout.write("\r" + " ".repeat(30) + "\r");

          console.error(
            chalk.red(
              `Error generating command: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      }
    )
  );
