// a cli script that creates a markdown file with the current
import { execSync } from "child_process";
const filename = `posts/${new Date().toISOString()}.md`;
execSync(`touch ${filename} && code ${filename}`);
