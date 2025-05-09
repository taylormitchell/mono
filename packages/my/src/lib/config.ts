import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { z } from "zod";
import chalk from "chalk";
import { createInterface } from "node:readline/promises";

function expandHome(val: string) {
  return val.startsWith("~") ? path.join(os.homedir(), val.slice(1)) : val;
}

function validateDir(p: string) {
  if (!fs.existsSync(p)) {
    throw new Error(`Directory does not exist: ${p}`);
  }
  return p;
}

// Config schema using Zod
const configSchema = z.object({
  notesDir: z.string().transform((p) => validateDir(expandHome(p))),
  monoDir: z.string().transform((p) => validateDir(expandHome(p))),
  googleCredentialsPath: z.string().optional().transform((p) => p ? expandHome(p) : p),
  googleTokenPath: z.string().optional().transform((p) => p ? expandHome(p) : p),
  defaultCalendarId: z.string().optional().default("primary"),
  defaultTaskListId: z.string().optional().default("@default"),
});

// TypeScript type inferred from Zod schema
export type MyConfig = z.infer<typeof configSchema>;

// Config file path
const CONFIG_DIR = path.join(os.homedir(), ".config", "my");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

// Singleton config instance
let configInstance: MyConfig | null = null;

/**
 * Create initial configuration with user input
 */
async function createInitialConfig(): Promise<MyConfig> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(chalk.cyan("Please provide the following configuration values:"));

  const notesDir = await rl.question(chalk.blue("Notes directory path: "));

  const monoDir = await rl.question(chalk.blue("Mono directory path: "));

  const useGoogle = await rl.question(
    chalk.blue("Do you want to configure Google API access? (y/N): ")
  );

  let googleCredentialsPath: string | undefined;
  let googleTokenPath: string | undefined;

  if (useGoogle.toLowerCase() === "y") {
    googleCredentialsPath = await rl.question(chalk.blue("Google credentials file path: "));
    googleTokenPath = await rl.question(chalk.blue("Google token file path: "));
  }

  rl.close();

  return {
    notesDir,
    monoDir,
    googleCredentialsPath,
    googleTokenPath,
  };
}

/**
 * Load configuration from file, create if it doesn't exist.
 * This should be called before any other function that depends on the config.
 */
export async function loadConfig(): Promise<MyConfig> {
  try {
    // Ensure config directory exists
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    if (!fs.existsSync(CONFIG_PATH)) {
      console.log(chalk.yellow("Config file not found. Let's create one!"));
      const config = await createInitialConfig();
      saveConfig(config);
      return config;
    }

    const configData = fs.readFileSync(CONFIG_PATH, "utf8");
    const parsedConfig = JSON.parse(configData);
    configInstance = configSchema.parse(parsedConfig);
    return configInstance;
  } catch (error) {
    console.error("Error loading config:", error);
    throw error;
  }
}

/**
 * Save configuration to file
 */
export function saveConfig(config: MyConfig): void {
  try {
    // Ensure config directory exists
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    // Validate config before saving
    const validatedConfig = configSchema.parse(config);

    // Write config to file
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(validatedConfig, null, 2));

    // Update the config singleton
    configInstance = validatedConfig;
  } catch (error) {
    console.error("Error saving config:", error);
  }
}

/**
 * Get config singleton, initializing if needed
 */
export function getConfig(): MyConfig {
  if (!configInstance) {
    throw new Error("Config not initialized. Call loadConfig() first.");
  }
  return configInstance;
}
