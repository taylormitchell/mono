import { initRepo } from "../../../shared/files";

export async function initCommand(): Promise<boolean> {
  try {
    await initRepo({ repoDir: process.cwd() });
    return true;
  } catch (error) {
    console.error(`Failed to initialize repository: ${error}`);
    return false;
  }
}
