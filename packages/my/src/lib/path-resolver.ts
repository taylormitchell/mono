import fs from "node:fs";
import path from "node:path";
import { getConfig } from "./config";

/**
 * Resolve a name or query to a directory path
 */
export async function resolvePath(nameOrQuery: string): Promise<string | null> {
  const config = getConfig();
  
  // Check if it's the notes directory
  if (nameOrQuery === "notes") {
    return config.notesDir;
  }

  // Check if it's the mono directory
  if (nameOrQuery === "mono") {
    return config.monoDir;
  }

  // Get packages directory from mono directory
  const packagesDir = path.join(config.monoDir, "packages");
  
  // Check packages directory first
  const packagePath = path.join(packagesDir, nameOrQuery);
  if (fs.existsSync(packagePath) && fs.statSync(packagePath).isDirectory()) {
    return packagePath;
  }

  // Check root directory (mono)
  const rootPath = path.join(config.monoDir, nameOrQuery);
  if (fs.existsSync(rootPath) && fs.statSync(rootPath).isDirectory()) {
    return rootPath;
  }

  // Check notes directory
  const notesPath = path.join(config.notesDir, nameOrQuery);
  if (fs.existsSync(notesPath) && fs.statSync(notesPath).isDirectory()) {
    return notesPath;
  }

  // If we get here, we couldn't find the directory
  return null;
}

/**
 * List directories in a given path or based on a query
 */
export async function listDirectories(pathOrQuery?: string): Promise<string[]> {
  const config = getConfig();
  
  // If no path/query provided, list directories in mono root
  if (!pathOrQuery) {
    const monoDir = config.monoDir;
    return fs.readdirSync(monoDir)
      .filter(item => fs.statSync(path.join(monoDir, item)).isDirectory())
      .map(dir => path.join(monoDir, dir));
  }
  
  // Try to resolve the path/query
  const resolvedPath = await resolvePath(pathOrQuery);
  
  // If resolved, list directories there
  if (resolvedPath) {
    return fs.readdirSync(resolvedPath)
      .filter(item => fs.statSync(path.join(resolvedPath, item)).isDirectory())
      .map(dir => path.join(resolvedPath, dir));
  }
  
  // If we get here, we couldn't resolve the path/query
  return [];
}