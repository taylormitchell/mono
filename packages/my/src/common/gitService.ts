import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import chalk from 'chalk';

const execAsync = promisify(exec);

/**
 * Git service for handling repository operations
 */
export class GitService {
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  /**
   * Execute a git command in the repository
   */
  private async execGit(command: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`git -C "${this.repoPath}" ${command}`);
      return stdout.trim();
    } catch (error: any) {
      throw new Error(`Git error: ${error.message}`);
    }
  }

  /**
   * Check if the directory is a git repository
   */
  async isGitRepo(): Promise<boolean> {
    try {
      await this.execGit('rev-parse --is-inside-work-tree');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the current branch name
   */
  async getCurrentBranch(): Promise<string> {
    return this.execGit('rev-parse --abbrev-ref HEAD');
  }

  /**
   * Pull changes from the remote repository
   */
  async pull(): Promise<string> {
    return this.execGit('pull');
  }

  /**
   * Push changes to the remote repository
   */
  async push(): Promise<string> {
    return this.execGit('push');
  }

  /**
   * Get git status
   */
  async status(): Promise<string> {
    return this.execGit('status');
  }

  /**
   * Sync repository (pull then push)
   */
  async sync(): Promise<{ pull: string; push: string }> {
    try {
      const pullResult = await this.pull();
      console.log(chalk.green('✓ Pull completed'));
      
      const pushResult = await this.push();
      console.log(chalk.green('✓ Push completed'));
      
      return { pull: pullResult, push: pushResult };
    } catch (error: any) {
      console.error(chalk.red(`Error during sync: ${error.message}`));
      throw error;
    }
  }
}