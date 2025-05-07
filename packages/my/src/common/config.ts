import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Config interface
export interface MyConfig {
  // General
  notesDir?: string;
  
  // Google API (to be expanded later)
  googleCredentialsPath?: string;
  googleTokenPath?: string;
  
  // Add more configuration options as needed
}

// Default configuration
const defaultConfig: MyConfig = {
  notesDir: path.join(os.homedir(), 'notes'),
};

// Config file path
const CONFIG_DIR = path.join(os.homedir(), '.config', 'my');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

/**
 * Load configuration from file, create if it doesn't exist
 */
export function loadConfig(): MyConfig {
  try {
    // Ensure config directory exists
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    
    // Read config file if it exists
    if (fs.existsSync(CONFIG_PATH)) {
      const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
      const userConfig = JSON.parse(configData);
      return { ...defaultConfig, ...userConfig };
    }
    
    // Create default config if it doesn't exist
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  } catch (error) {
    console.error('Error loading config:', error);
    return defaultConfig;
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
    
    // Write config to file
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving config:', error);
  }
}

// Singleton config instance
let configInstance: MyConfig | null = null;

/**
 * Get config singleton
 */
export function getConfig(): MyConfig {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}