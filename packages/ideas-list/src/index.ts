import { readFileSync } from "fs";
import { unified } from "unified";
import remarkParse from "remark-parse";

const ideas = readFileSync("/Users/taylormitchell/code/home/data/notes/ideas-list.md", "utf-8");

// Parse markdown into AST
const ast = unified().use(remarkParse).parse(ideas);

function getText(node: ListItem) {
  return node.children[0].children[0].value;
}

// Iterate over root's direct children that are lists
ast.children
  .filter((node) => node.type === "list")
  .forEach((list) => {
    // Iterate over list items
    list.children.forEach((item, i) => {
      if (item.type === "listItem") {
        const startIndex = item.position?.start?.offset;
        const endIndex = item.position?.end?.offset;
        console.log(`List item ${i + 1}:`, ideas.slice(startIndex, endIndex));
      }
    });
  });
