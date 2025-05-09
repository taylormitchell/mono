import { Command } from "commander";
import { z } from "zod";
import chalk from "chalk";
import { an } from "../lib/an";
import { askQuestion } from "../integrations/openai";

export const askCommand = new Command("ask")
  .description("Ask a question to AI")
  .argument("<question...>", "Question to ask")
  .option("--model <name>", "OpenAI model to use (default: gpt-4o-mini)")
  .action(
    an(
      z.tuple([
        z.array(z.string()).min(1),
        z.object({
          model: z.string().optional(),
        }),
      ]),
      async (questionArray, options) => {
        try {
          // Join the question array into a string
          const question = questionArray.join(" ");

          // Display thinking indicator
          process.stdout.write(chalk.yellow("Thinking..."));

          // Query OpenAI
          const answer = await askQuestion(question);

          // Clear the thinking indicator and display the answer
          process.stdout.write("\r" + " ".repeat(30) + "\r"); // Clear the line
          console.log(answer);
        } catch (error) {
          // Clear the thinking indicator if there's an error
          process.stdout.write("\r" + " ".repeat(30) + "\r");

          console.error(
            chalk.red(
              `Error getting answer: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      }
    )
  );
