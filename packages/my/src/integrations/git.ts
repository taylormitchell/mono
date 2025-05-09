import simpleGit from 'simple-git';
import type { SimpleGit } from 'simple-git';
import chalk from 'chalk';
import { exec } from 'child_process';

/**
 * Create git client instance for a repository
 */
export function createGitClient(repoPath: string): SimpleGit {
  return simpleGit(repoPath);
}

/**
 * Check if directory is a git repository
 */
export async function isGitRepo(repoPath: string): Promise<boolean> {
  try {
    const git = createGitClient(repoPath);
    await git.revparse(['--is-inside-work-tree']);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(repoPath: string): Promise<string> {
  const git = createGitClient(repoPath);
  const result = await git.revparse(['--abbrev-ref', 'HEAD']);
  return result.trim();
}

/**
 * Pull changes from remote repository
 */
export async function pullChanges(repoPath: string): Promise<string> {
  const git = createGitClient(repoPath);
  const result = await git.pull();
  return JSON.stringify(result);
}

/**
 * Push changes to remote repository
 */
export async function pushChanges(repoPath: string): Promise<string> {
  const git = createGitClient(repoPath);
  const result = await git.push();
  return JSON.stringify(result);
}

/**
 * Get repository status
 */
export async function getStatus(repoPath: string): Promise<string> {
  const git = createGitClient(repoPath);
  const status = await git.status();
  return JSON.stringify(status);
}

/**
 * Sync repository (pull then push)
 */
export async function syncRepo(repoPath: string): Promise<{ pull: string; push: string }> {
  try {
    const pullResult = await pullChanges(repoPath);
    console.log(chalk.green('✓ Pull completed'));
    
    const pushResult = await pushChanges(repoPath);
    console.log(chalk.green('✓ Push completed'));
    
    return { pull: pullResult, push: pushResult };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error during sync: ${errorMessage}`));
    throw error;
  }
}

/**
 * Execute arbitrary git command
 */
export async function executeGit(
  args: string[],
  options: { cwd: string }
): Promise<{ success: boolean; data: string }> {
  return new Promise((resolve) => {
    const command = `git ${args.join(' ')}`;
    exec(command, { cwd: options.cwd }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, data: stderr || error.message });
      } else {
        resolve({ success: true, data: stdout });
      }
    });
  });
}