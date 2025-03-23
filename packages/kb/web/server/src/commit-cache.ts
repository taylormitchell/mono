import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { env } from "./env";
import {
  getCurrentCommit,
  getLastCommit,
  getFirstCommitInfo,
  getChangedFilesSince,
} from "../../shared/git";

// Define the schema for a commit entry
const commitEntrySchema = z.object({
  hash: z.string(),
  date: z.string(),
  author: z.string().optional(),
  message: z.string().optional(),
});

// Define the schema for the cache file
const commitCacheSchema = z.object({
  schemaVersion: z.number(),
  lastUpdatedHead: z.string(),
  files: z.record(
    z.string(), // file path
    z.object({
      firstCommit: commitEntrySchema.nullable(),
      lastCommit: commitEntrySchema.nullable(),
    })
  ),
});

// Type definitions based on the schema
export type CommitEntry = z.infer<typeof commitEntrySchema>;
export type CommitCache = z.infer<typeof commitCacheSchema>;

// Default empty cache
const DEFAULT_CACHE: CommitCache = {
  schemaVersion: 1,
  lastUpdatedHead: "",
  files: {},
};

// In-memory cache
let memoryCache: CommitCache | null = null;

// Track initialization with a promise
let initializationPromise: Promise<void> | null = null;

// Track cache updates with a promise
let updatePromise: Promise<CommitCache> | null = null;

/**
 * Loads the commit cache from disk
 */
async function loadCacheFromDisk(): Promise<CommitCache> {
  try {
    // Check if the cache file exists
    try {
      await fs.access(env.COMMIT_CACHE_PATH);
    } catch (error) {
      // File doesn't exist, return default cache
      return DEFAULT_CACHE;
    }

    // Read and parse the cache file
    const cacheContent = await fs.readFile(env.COMMIT_CACHE_PATH, "utf-8");
    const parsedCache = JSON.parse(cacheContent);

    // Validate against schema
    return commitCacheSchema.parse(parsedCache);
  } catch (error) {
    console.error("Error loading commit cache:", error);
    return DEFAULT_CACHE;
  }
}

/**
 * Saves the commit cache to disk
 */
async function saveCacheToDisk(cache: CommitCache): Promise<void> {
  try {
    // Ensure the directory exists
    await fs.mkdir(path.dirname(env.COMMIT_CACHE_PATH), { recursive: true });

    // Write the cache to disk
    await fs.writeFile(env.COMMIT_CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving commit cache:", error);
  }
}

/**
 * Gets the full commit information for a file
 */
async function getFullCommitInfo(
  filePath: string
): Promise<{ firstCommit: CommitEntry | null; lastCommit: CommitEntry | null }> {
  // Get last commit info
  const lastCommit = await getLastCommit(filePath, { cwd: env.GIT_REPO_PATH });

  // Get first commit info
  const firstCommit = await getFirstCommitInfo(filePath, { cwd: env.GIT_REPO_PATH });

  return {
    firstCommit: firstCommit
      ? {
          hash: firstCommit.hash,
          date: firstCommit.date,
          author: firstCommit.author,
          message: firstCommit.message,
        }
      : null,
    lastCommit: lastCommit
      ? {
          hash: lastCommit.hash,
          date: lastCommit.date,
          author: lastCommit.author,
          message: lastCommit.message,
        }
      : null,
  };
}

/**
 * Updates the cache for changed files
 */
async function updateCache(cache: CommitCache): Promise<CommitCache> {
  // If already updating, wait for that to complete
  if (updatePromise) {
    return await updatePromise;
  }

  // Create a new update promise
  updatePromise = (async () => {
    try {
      // Get current HEAD commit
      const currentHead = await getCurrentCommit({ cwd: env.GIT_REPO_PATH });
      if (!currentHead) {
        console.error("Failed to get current HEAD commit");
        return cache;
      }

      // If HEAD hasn't changed, return the current cache
      if (cache.lastUpdatedHead === currentHead) {
        return cache;
      }

      // Get files that have changed since the last update
      const changedFiles = await getChangedFilesSince(cache.lastUpdatedHead || null, {
        cwd: env.GIT_REPO_PATH,
      });

      // Create a new cache object
      const updatedCache: CommitCache = {
        ...cache,
        lastUpdatedHead: currentHead,
      };

      // Update cache for each changed file
      for (const filePath of changedFiles) {
        // Skip metadata files
        if (filePath.startsWith(".metadata/")) {
          continue;
        }

        // Get commit info for the file
        const commitInfo = await getFullCommitInfo(filePath);

        // Update the cache
        updatedCache.files[filePath] = commitInfo;
      }

      // Save the updated cache to disk
      await saveCacheToDisk(updatedCache);

      return updatedCache;
    } finally {
      // Clear the update promise when done
      updatePromise = null;
    }
  })();

  // Wait for the update to complete and return the result
  return await updatePromise;
}

/**
 * Initializes the commit cache
 */
export async function initCommitCache(): Promise<void> {
  // If already initializing, wait for that to complete
  if (initializationPromise) {
    await initializationPromise;
    return;
  }

  // Create a new initialization promise
  initializationPromise = (async () => {
    try {
      // Load the cache from disk
      const diskCache = await loadCacheFromDisk();

      // Update the cache with any changes
      memoryCache = await updateCache(diskCache);

      console.log(`Commit cache initialized with ${Object.keys(memoryCache.files).length} files`);
    } catch (error) {
      console.error("Error initializing commit cache:", error);
      // Set a default cache on error
      memoryCache = DEFAULT_CACHE;
      throw error;
    }
  })();

  // Wait for initialization to complete
  await initializationPromise;
}

/**
 * Ensures the cache is initialized
 */
async function ensureCacheInitialized(): Promise<void> {
  if (!memoryCache) {
    await initCommitCache();
  }
}

/**
 * Gets commit information for a file, either from cache or by fetching it
 */
export async function getCommitInfoForFile(filePath: string): Promise<{
  firstCommit: CommitEntry | null;
  lastCommit: CommitEntry | null;
}> {
  // Ensure the cache is initialized
  await ensureCacheInitialized();

  // Ensure the cache is up to date
  memoryCache = await updateCache(memoryCache!);

  // Check if the file is in the cache
  if (memoryCache!.files[filePath]) {
    return memoryCache!.files[filePath];
  }

  // If not in cache, get the commit info and update the cache
  const commitInfo = await getFullCommitInfo(filePath);

  // Update the cache
  memoryCache!.files[filePath] = commitInfo;
  await saveCacheToDisk(memoryCache!);

  return commitInfo;
}

/**
 * Clears the commit cache
 */
export async function clearCommitCache(): Promise<void> {
  // Wait for any ongoing initialization to complete
  if (initializationPromise) {
    await initializationPromise;
  }

  memoryCache = DEFAULT_CACHE;
  await saveCacheToDisk(DEFAULT_CACHE);
  console.log("Commit cache cleared");
}
