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
    const root = path.resolve(__dirname, "../../data");
    let relativePath = "";
    let filePrefix = "";
    // find index of last / in line
    const lastSlashIndex = line.lastIndexOf("/");
    if (lastSlashIndex !== -1) {
      relativePath = line.slice(0, lastSlashIndex);
      filePrefix = line.slice(lastSlashIndex + 1);
    } else {
      relativePath = "";
      filePrefix = line;
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
