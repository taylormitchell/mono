import path from "path";
import { execSync } from "child_process";

export function getRootDir() {
  return path.resolve(__dirname, "../../data");
}

export function save(filepath: string, message?: string) {
  execSync(`cd ${getRootDir()}`);
  execSync(`git stash save "Stashing changes during data save $(date)"`);
  execSync(`git pull`);
  execSync(`git add ${filepath}`);
  execSync(`git commit -m "${message || `Save ${filepath}`}"`);
  execSync(`git push`);
}
