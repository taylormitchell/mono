import {
  getFirstCommitDate,
  getLastCommit,
  isGitRepository,
  getLatestCommitHash,
  getChangedFilesSince,
  getPreviousPath,
  executeGit,
} from "../../shared/git";
import { scanRepository } from "../../shared/utils/files";
import { handleRenamedFile } from "../../shared/files";
import { initConfig } from "../../shared/config";
import path from "path";
import { mkdtemp, mkdir, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";

async function createTestRepo() {
  // Create a temporary directory
  const tempDir = await mkdtemp(path.join(tmpdir(), "git-test-"));
  console.log(`Created temporary test directory: ${tempDir}`);

  // Initialize git repository
  await executeGit(["init"], { cwd: tempDir });

  // Create some test files
  await writeFile(path.join(tempDir, "test1.txt"), "Test file 1 content");
  await writeFile(path.join(tempDir, "test2.txt"), "Test file 2 content");

  // Make initial commit
  await executeGit(["add", "."], { cwd: tempDir });
  await executeGit(["config", "user.name", "Test User"], { cwd: tempDir });
  await executeGit(["config", "user.email", "test@example.com"], { cwd: tempDir });
  await executeGit(["commit", "-m", "Initial commit"], { cwd: tempDir });

  return tempDir;
}

async function runTests() {
  console.log("Running tests...");

  // Create a test repository in a temporary directory
  const testRepoPath = await createTestRepo();
  console.log(`Test repository created at: ${testRepoPath}`);

  try {
    // Check if we're in a git repository
    const isGitRepo = await isGitRepository();
    console.log(`Is git repository: ${isGitRepo}`);
    if (!isGitRepo) {
      console.error("Not in a git repository. Tests cannot continue.");
      return;
    }

    // Get the latest commit hash
    const latestCommitHash = await getLatestCommitHash({ cwd: testRepoPath });
    console.log(`Latest commit hash: ${latestCommitHash}`);

    // Initialize config
    const config = initConfig({ cwd: testRepoPath });
    console.log("Config initialized:", config);

    // Scan repository
    const files = await scanRepository(config?.ignore || [], { cwd: testRepoPath });
    console.log(`Found ${files.length} files in the repository:`);
    files.forEach((file) => console.log(`- ${file}`));

    if (files.length > 0) {
      // Test with each file
      for (const testFile of files) {
        console.log(`\nTesting with file: ${testFile}`);

        // Get first commit date
        const firstCommitDate = await getFirstCommitDate(testFile, { cwd: testRepoPath });
        console.log(`First commit date: ${firstCommitDate}`);

        // Get last commit
        const lastCommit = await getLastCommit(testFile, { cwd: testRepoPath });
        console.log(`Last commit: ${JSON.stringify(lastCommit)}`);

        // Check for previous path (renames)
        const previousPath = await getPreviousPath(testFile, { cwd: testRepoPath });
        console.log(`Previous path: ${previousPath || "None (not renamed)"}`);

        // Generate metadata
        // const metadata = await generateMetadata(testFile, { cwd: testRepoPath });
        // console.log(`Generated metadata: ${JSON.stringify(metadata, null, 2)}`);

        // Test rename handling if applicable
        if (previousPath) {
          console.log(`Testing rename handling for ${testFile}`);
          const renameResult = await handleRenamedFile(testFile);
          console.log(`Rename handling result: ${renameResult}`);
        }
      }
    }

    // Get changed files since a commit
    if (latestCommitHash) {
      // Use the first commit to see all changes
      const firstCommit = await executeGit(["rev-list", "--max-parents=0", "HEAD"], {
        cwd: testRepoPath,
      });
      if (firstCommit.success && firstCommit.data) {
        const changedFiles = await getChangedFilesSince(firstCommit.data, {
          cwd: testRepoPath,
        });
        console.log(`\nChanged files since first commit: ${changedFiles.length}`);
        changedFiles.forEach((file) => console.log(`- ${file}`));
      }
    }

    console.log("\nTests completed successfully.");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await rm(testRepoPath, { recursive: true, force: true });
  }
}

runTests().catch((error) => {
  console.error("Test failed:", error);
});
