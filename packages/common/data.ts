import path from "path";
export function getRootDir() {
  return path.resolve(__dirname, "../../data");
  // let d = 0;
  // let rootDir = __dirname;
  // while (!fs.existsSync(path.join(rootDir, "package.json"))) {
  //   rootDir = path.dirname(rootDir);
  //   d += 1;
  //   if (d > 10) {
  //     throw new Error("Could not find root directory");
  //   }
  // }
  // return rootDir;
}
