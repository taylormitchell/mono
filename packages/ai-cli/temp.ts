import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

function log(...messages: string[]) {
  fs.appendFileSync(path.resolve(__dirname, "log.txt"), messages.join(" ") + "\n");
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  completer: (line: string) => {
    // Only autocomplete after an @ symbol
    if (!line.startsWith("@")) {
      return [null, line];
    }

    const partial = line.slice(1);
    const root = path.resolve(__dirname, "../../data");
    let relativePath = "";
    let filePrefix = "";
    // find index of last / in line
    const lastSlashIndex = partial.lastIndexOf("/");
    if (lastSlashIndex !== -1) {
      relativePath = partial.slice(0, lastSlashIndex);
      filePrefix = partial.slice(lastSlashIndex + 1);
    } else {
      relativePath = "";
      filePrefix = partial;
    }
    const dir = path.join(root, relativePath);
    const files = fs.readdirSync(dir);
    log(dir, relativePath, filePrefix);
    log(...files);
    const filteredFiles = files.filter((file) => file.startsWith(filePrefix));
    const paths = filteredFiles.map((file) => path.join(relativePath, file));
    return [paths, line];
  },
});

console.log("Type a filename or path and press TAB for autocomplete.");

rl.prompt();

rl.on("line", (line) => {
  console.log(`You entered: ${line}`);
  rl.prompt();
});

rl.on("close", () => {
  console.log("Exiting...");
  process.exit(0);
});
