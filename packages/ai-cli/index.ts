import { Command } from "commander";
import { OpenAI } from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import dotenv from "dotenv";
import readlineSync from "readline-sync";
import fs from "fs";
import path from "path";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize an array to store conversation history
let conversationHistory: ChatCompletionMessageParam[] = [];

function getFileSuggestions(inputPath: string): string[] {
  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath);
  const fullDir = path.resolve(process.cwd(), dir);

  try {
    return fs
      .readdirSync(fullDir)
      .filter((file) => file.startsWith(base))
      .map((file) => path.join(dir, file));
  } catch (error) {
    return [];
  }
}

async function chat() {
  const input = readlineSync.question("You: ", {
    tabComplete: function (str: string) {
      if (str.startsWith("~/")) {
        return getFileSuggestions(str.replace("~/", ""));
      }
      return [];
    },
  });

  if (input.toLowerCase() === "exit") {
    return;
  }

  try {
    // Add user input to conversation history
    conversationHistory.push({ role: "user", content: input });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: conversationHistory,
    });

    const aiResponse = response.choices[0].message.content?.trim();
    console.log("AI:", aiResponse);

    // Add AI response to conversation history
    conversationHistory.push({ role: "assistant", content: aiResponse || "" });

    chat(); // Continue the conversation
  } catch (error) {
    console.error("Error:", error);
    chat(); // Continue despite error
  }
}

const program = new Command();

program
  .version("1.0.0")
  .description("A CLI tool to interact with OpenAI")
  .action(() => {
    console.log("Welcome to the AI chat. Type 'exit' to end the conversation.");
    chat();
  });

program.parse(process.argv);
