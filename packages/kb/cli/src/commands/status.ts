import { executeGit, getCurrentCommit, getChangedFilesSince } from "../../../shared/git";
import chalk from "chalk";
import { readConfig, METADATA_DIR } from "../../../shared/repo";

export async function statusCommand(): Promise<boolean> {
  // Check if we're in a git repository
  const isGitRepo = await executeGit(["rev-parse", "--is-inside-work-tree"]);
  if (!isGitRepo.success || isGitRepo.data !== "true") {
    console.error("Error: Not in a git repository");
    return false;
  }

  // Get git status
  const gitStatus = await executeGit(["status", "--short"]);
  if (!gitStatus.success) {
    console.error(`Error getting git status: ${gitStatus.error}`);
    return false;
  }

  if (gitStatus.data.trim() === "") {
    console.log("Nothing to save");
  } else {
    console.log(gitStatus.data);
    return true;
  }

  const config = readConfig({ repoDir: process.cwd() });
  if (!config) {
    console.log("Metadata not initialized. Run 'git-metadata init' to set up.");
    return true;
  }

  try {
    const lastSavedCommit = config.lastCommitHash;
    if (!lastSavedCommit) {
      console.log("No saved commit hash found in metadata config.");
      return true;
    }

    // Get current commit
    const currentCommit = await getCurrentCommit();
    if (!currentCommit) {
      console.log("Unable to determine current commit.");
      return true;
    }

    // Check if any non-metadata files have changed
    const changedFiles = await getChangedFilesSince(lastSavedCommit, { cwd: process.cwd() });
    const nonMetadataChanges = changedFiles.filter((file) => !file.startsWith(METADATA_DIR));

    if (nonMetadataChanges.length === 0) {
      console.log("Metadata is up to date.");
    } else {
      console.log(
        `Metadata is out of date. ${nonMetadataChanges.length} files have changed since last update.`
      );
      console.log("Run 'git-metadata update' to update metadata.");

      if (nonMetadataChanges.length <= 5) {
        console.log("\nChanged files:");
        nonMetadataChanges.forEach((file) => console.log(`- ${file}`));
      }
    }
  } catch (error) {
    console.error(
      `Error checking metadata status: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }

  return true;
}
