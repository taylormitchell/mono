import { Issue, LinearClient } from "@linear/sdk";
import * as fs from "fs";
import * as path from "path";

export function getApiKey(): string | null {
  const configPath = path.join(process.env.HOME || "", ".config", "my", "linear", "client.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const { apiKey } = config;
  if (!apiKey) {
    return null;
  }
  return apiKey;
}

export async function getIssues(): Promise<Issue[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("No API key found in config");
    process.exit(1);
  }

  // Initialize Linear client
  const linearClient = new LinearClient({ apiKey });

  try {
    // Fetch my assigned issues that aren't completed
    const { nodes: issues } = await linearClient.issues({
      filter: {
        assignee: { isMe: { eq: true } },
        state: { type: { neq: "completed" } },
      },
    });
    return issues;
  } catch (error) {
    console.error("Error fetching Linear issues:", error);
    return [];
  }
}
