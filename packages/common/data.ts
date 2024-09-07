import path from "path";
import { execSync } from "child_process";

export function getRootDir() {
  return path.resolve(__dirname, "../../data");
}

export function commitAndPush(filepath: string, message?: string) {
  execSync(`git add ${filepath}`);
  execSync(`git commit -m "${message || `Save ${filepath}`}"`);
  execSync(`git push`);
}
