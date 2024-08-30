import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    completer: fileCompleter,
  });
}

function fileCompleter(line: string): [string[], string] {
  const lineUntilCursor = line.slice(0, readline.cursorTo(process.stdout, 0));
  const lastToken = lineUntilCursor.split(" ").pop() || "";
  const dir = path.dirname(lastToken);
  const base = path.basename(lastToken);

  let files: string[];
  try {
    files = fs.readdirSync(dir);
  } catch (err) {
    files = fs.readdirSync(".");
  }

  const hits = files.filter((file) => file.startsWith(base));

  if (hits.length === 1) {
    const full = path.join(dir, hits[0]);
    if (fs.statSync(full).isDirectory()) {
      return [[full + "/"], lineUntilCursor];
    }
  }

  return [hits.length ? hits.map((file) => path.join(dir, file)) : files, lineUntilCursor];
}

const rl = createInterface();

rl.setPrompt("Enter a file path: ");
rl.prompt();

rl.on("line", (line) => {
  console.log(`You entered: ${line}`);
  rl.prompt();
}).on("close", () => {
  console.log("Goodbye!");
  process.exit(0);
});
