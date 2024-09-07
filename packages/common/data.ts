import path from "path";
import { execSync } from "child_process";

export function getRootDir() {
  return path.resolve(__dirname, "../../data");
}

export function save(
  filepath: string,
  message?: string
): {
  ok: boolean;
  stashed: boolean;
  error?: string;
} {
  try {
    execSync(`cd ${getRootDir()}`);

    let stashed = false;
    try {
      execSync(`git stash save "Stashing changes during data save $(date)"`);
      stashed = true;
    } catch (error) {
      // If stash fails, it might be because there are no changes to stash
      if (!(error instanceof Error) || !error.message.includes("No local changes to save")) {
        throw error;
      }
    }

    execSync(`git pull`);
    execSync(`git add ${filepath}`);
    execSync(`git commit -m "${message || `Save ${filepath}`}"`);
    execSync(`git push`);

    return { ok: true, stashed };
  } catch (error) {
    return {
      ok: false,
      stashed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
