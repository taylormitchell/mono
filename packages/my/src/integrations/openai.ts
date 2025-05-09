import fs from "fs";
import path from "path";
import os from "os";
import chalk from "chalk";
import { z } from "zod";

// OpenAI API URL for chat completions
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// Schema for API key config
const clientSchema = z.object({
  apiKey: z.string(),
});

/**
 * Get OpenAI API Key from config file or environment
 */
function getApiKey(): string {
  const configDir = path.join(os.homedir(), ".config", "my", "openai");
  const client = clientSchema.parse(
    JSON.parse(fs.readFileSync(path.join(configDir, "client.json"), "utf8"))
  );
  return client.apiKey;
}

/**
 * Interface for chat message
 */
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Send request to OpenAI API
 */
export async function askOpenAI(
  messages: ChatMessage[],
  model: string = "gpt-4o-mini"
): Promise<string> {
  try {
    const apiKey = getApiKey();

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API Error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error(
      chalk.red(`Error querying OpenAI: ${error instanceof Error ? error.message : String(error)}`)
    );
    throw error;
  }
}

/**
 * Ask a general question to the AI
 */
export async function askQuestion(question: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: "You are a helpful assistant. Provide concise and accurate answers.",
    },
    {
      role: "user",
      content: question,
    },
  ];

  return askOpenAI(messages);
}

/**
 * Get a command suggestion from AI based on natural language input
 */
export async function getCommandSuggestion(request: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are a command-line assistant that helps generate shell commands.
Given a natural language description, output ONLY the command that would accomplish the task.
Do not include explanations, markdown formatting, or any other text.
For example, if asked "find all javascript files in the current directory", you should respond with: find . -name "*.js"
Keep commands simple and portable, avoiding complex syntax or obscure tools unless specifically requested.`,
    },
    {
      role: "user",
      content: request,
    },
  ];

  return askOpenAI(messages);
}
