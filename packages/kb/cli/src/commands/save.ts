import { commitAll } from "../../../shared/git";
import { updateRepo } from "../../../shared/repo";

export async function saveCommand(): Promise<boolean> {
  try {
    await commitAll({ cwd: process.cwd(), message: "File updates from web client" });
    await updateRepo({ repoDir: process.cwd(), message: "Update metadata" });
    return true;
  } catch (error) {
    console.error(`Failed to save repository: ${error}`);
    return false;
  }
}
