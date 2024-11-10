import { readFileSync } from "fs";
import { unified } from "unified";
import remarkParse from "remark-parse";

const ideas = readFileSync("/Users/taylormitchell/code/home/data/notes/ideas-list.md", "utf-8");

// Parse markdown into AST
const ast = unified().use(remarkParse).processSync(ideas).tree;

console.log(JSON.stringify(ast, null, 2));
