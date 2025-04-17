import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

export function editBuffer(initial: string): string {
  const tmp = path.join(os.tmpdir(), `gcal-${Date.now()}.md`);
  fs.writeFileSync(tmp, initial);
  const editor = process.env.EDITOR ?? "vi";
  spawnSync(editor, [tmp], { stdio: "inherit" });
  const output = fs.readFileSync(tmp, "utf8");
  fs.unlinkSync(tmp);
  return output;
}
