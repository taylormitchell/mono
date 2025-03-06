import { updateRepo } from "../../../shared/files";

export async function updateCommand(
  options: { force?: boolean; verbose?: boolean } = {}
): Promise<boolean> {
  return updateRepo(options);
}
