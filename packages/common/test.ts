import { processTemplate } from "./note";
import { listAllTodos } from "./todo";

const md = `
# {{date}}

- TODO morning routine
  {{> morning-routine}}
`;

console.log(processTemplate(md));

// function testDailyNoteTemplate() {
//   const md = fs.readFileSync(getTemplatePath("daily-note-template"), "utf-8");
//   console.log(processTemplate(md));
// }

// testDailyNoteTemplate();

listAllTodos();
