import path from "path";
import { parseMarkdownFile } from "./core";

const md = `
# Some document
with some text
TODO something
TODO another thing {due: 2024-08-12}
last
`.trim();

// const res = parseMarkdown(md);
// console.log(JSON.stringify(res, null, 2));

const res = parseMarkdownFile(path.join(__dirname, "test.md"));
console.log(JSON.stringify(res, null, 2));
