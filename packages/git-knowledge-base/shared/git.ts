import { spawn } from "bun";

/**
 * Executes a git command and returns the result
 */
export async function executeGit(
  args: string[],
  options?: { cwd?: string }
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const proc = spawn(["git", ...args], {
      stdout: "pipe",
      stderr: "pipe",
      cwd: options?.cwd,
    });

    const output = await new Response(proc.stdout).text();
    const error = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      return {
        success: false,
        error: error.trim() || `Git command failed with exit code ${exitCode}`,
      };
    }

    return {
      success: true,
      data: output.trim(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Gets the first commit date for a file
 * @param filePath Path to the file
 * @returns ISO datetime string of the first commit or null if not found
 */
export async function getFirstCommitDate(
  filePath: string,
  options?: { cwd?: string }
): Promise<string | null> {
  // Use git log with reverse order to get the first commit
  const result = await executeGit(
    [
      "log",
      "--follow", // Follow renames
      "--format=%aI", // ISO 8601 author date
      "--reverse", // Oldest first
      "--",
      filePath,
    ],
    { cwd: options?.cwd }
  );

  if (!result.success || !result.data) {
    const issue = !result.success ? result.error : "No data returned";
    console.error(`Failed to get first commit date for ${filePath}: ${issue}`);
    return null;
  }

  // Get the first line (first commit date)
  const lines = result.data.split("\n");
  return lines[0] ?? null;
}

export async function getCurrentCommit(options?: { cwd?: string }): Promise<string | null> {
  const result = await executeGit(["rev-parse", "HEAD"], { cwd: options?.cwd });
  return result.success && result.data ? result.data : null;
}

/**
 * Gets the last commit date and hash for a file
 * @param filePath Path to the file
 * @returns Object containing the last commit date and hash, or null if not found
 */
export async function getLastCommit(
  filePath: string,
  options?: { cwd?: string }
): Promise<{ date: string; hash: string } | null> {
  // Use git log to get the last commit
  const result = await executeGit(["log", "-1", "--format=%H%n%aI", "--", filePath], {
    cwd: options?.cwd,
  });

  if (!result.success || !result.data) {
    const issue = !result.success ? result.error : "No data returned";
    console.error(`Failed to get last commit for ${filePath}: ${issue}`);
    return null;
  }

  // Parse the output (hash on first line, date on second)
  const lines = result.data.split("\n");
  if (lines.length < 2) {
    console.error(`Unexpected git log output format for ${filePath}`);
    return null;
  }

  return {
    hash: lines[0],
    date: lines[1],
  };
}

/**
 * Checks if a file has been renamed since a specific commit
 */
export async function getPreviousPath(
  filePath: string,
  sinceCommit: string | null,
  options?: { cwd?: string }
): Promise<string | null> {
  const result = await executeGit(
    [
      "log",
      "--follow",
      "--name-status",
      "--format=%H",
      sinceCommit ? `${sinceCommit}..HEAD` : "",
      "--",
      filePath,
    ],
    { cwd: options?.cwd }
  );

  if (!result.success || !result.data) {
    return null;
  }

  // Parse the output to find rename entries
  // Format will be: commit-hash followed by R100 old-path new-path
  const lines = result.data.split("\n");
  let currentCommit = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (
      line &&
      !line.startsWith("R") &&
      !line.startsWith("A") &&
      !line.startsWith("M") &&
      !line.startsWith("D")
    ) {
      // This is a commit hash line
      currentCommit = line;
    } else if (line.startsWith("R")) {
      const parts = line.split("\t");
      if (parts.length >= 3) {
        // parts[1] is the old path, parts[2] is the new path
        return parts[1];
      }
    }
  }

  return null;
}

/**
 * Gets all files that have changed since a specific commit
 * @param lastCommitHash The commit hash to compare against
 * @returns Array of changed file paths
 */
export async function getChangedFilesSince(
  lastCommitHash: string | null,
  options?: { cwd?: string }
): Promise<string[]> {
  if (!lastCommitHash) {
    // If no commit hash provided, return all files in the repo
    console.log("Getting all files in repo", { cwd: options?.cwd });
    const result = await executeGit(["ls-files"], { cwd: options?.cwd });

    if (!result.success || !result.data) {
      const issue = !result.success ? result.error : "No data returned";
      console.error(`Failed to list files: ${issue}`);
      return [];
    }

    return result.data.split("\n").filter(Boolean);
  }

  // Get files that have changed since the last commit hash
  console.log("Getting changed files since", lastCommitHash);
  const result = await executeGit(["diff", "--name-only", lastCommitHash, "HEAD"], {
    cwd: options?.cwd,
  });

  if (!result.success) {
    console.error(`Failed to get changed files: ${result.error}`);
    return [];
  }

  return result.data.split("\n").filter(Boolean);
}

/**
 * Gets the latest commit hash in the repository
 * @returns The latest commit hash or null if not found
 */
export async function getLatestCommitHash(options?: { cwd?: string }): Promise<string | null> {
  const result = await executeGit(["rev-parse", "HEAD"], { cwd: options?.cwd });

  if (!result.success || !result.data) {
    const issue = !result.success ? result.error : "No data returned";
    console.error(`Failed to get latest commit hash: ${issue}`);
    return null;
  }

  return result.data;
}

/**
 * Checks if the current directory is a git repository
 * @returns True if the current directory is a git repository, false otherwise
 */
export async function isGitRepository(options?: { cwd?: string }): Promise<boolean> {
  const result = await executeGit(["rev-parse", "--is-inside-work-tree"], {
    cwd: options?.cwd,
  });

  return result.success && result.data === "true";
}

export async function commitIsLater(
  commit1: string,
  commit2: string,
  options?: { cwd?: string }
): Promise<boolean> {
  const result = await executeGit(["rev-list", "--count", "--left-only", commit1, commit2], {
    cwd: options?.cwd,
  });
  return result.success && result.data ? parseInt(result.data) > 0 : false;
}
