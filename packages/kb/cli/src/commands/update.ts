import { updateRepo } from "../../../shared/repo";

export async function updateCommand(
  options: { force?: boolean; verbose?: boolean } = {}
): Promise<boolean> {
  try {
    await updateRepo({ repoDir: process.cwd() });
    return true;
  } catch (error) {
    console.error(`Failed to update repository: ${error}`);
    return false;
  }
}
