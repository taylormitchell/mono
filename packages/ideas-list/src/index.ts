import { readFileSync } from "fs";
import { unified } from "unified";
import remarkParse from "remark-parse";

const ideas = readFileSync("/Users/taylormitchell/code/home/data/notes/ideas-list.md", "utf-8");

// Parse markdown into AST
const ast = unified().use(remarkParse).parse(ideas);

function extractMetadata(text: string): Record<string, any> {
  // Match all instances of {{ ... }}
  const metadataRegex = /{{([^}]+)}}/g;
  const matches = text.matchAll(metadataRegex);

  // Merge all metadata objects together
  return Array.from(matches).reduce((acc, match) => {
    try {
      // Parse the JSON inside the curly braces
      const metadata = JSON.parse(match[1]);
      return { ...acc, ...metadata };
    } catch (e) {
      // If JSON parsing fails, skip this token
      console.warn(`Failed to parse metadata: ${match[1]}`);
      return acc;
    }
  }, {});
}

// Iterate over root's direct children that are lists
ast.children
  .filter((node) => node.type === "list")
  .forEach((list) => {
    // Iterate over list items
    list.children.forEach((item, i) => {
      if (item.type === "listItem") {
        const startIndex = item.children[0].position?.start?.offset;
        const endIndex = item.children[item.children.length - 1].position?.end?.offset;
        const text = ideas.slice(startIndex, endIndex);
        const metadata = extractMetadata(text);
        console.log(text, metadata);
      }
    });
  });
