import { readFileSync } from "fs";

const ideas = readFileSync("/Users/taylormitchell/code/home/data/notes/ideas-list.md", "utf-8");

console.log(ideas);
