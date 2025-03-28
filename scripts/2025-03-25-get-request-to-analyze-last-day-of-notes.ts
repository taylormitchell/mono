import { $ } from "bun";

const prompt = `
Please analyze the following git diff of my personal notes from the last 24 hours and provide a concise, bulleted summary.

\`\`\`
{{DIFF}}
\`\`\`

Focus on these key areas:

## Key Information
- Important concepts, ideas, or information captured
- Notable patterns or connections between topics

## Questions and Uncertainties
- Explicitly noted questions
- Areas needing further exploration

## Action Items
- New TODOs created
- Next steps based on notes
- Mentioned deadlines

## Flashcards
- Suggest 2-3 flashcards based on the most important content
- Prioritize information about people in my life

Notes:
- Ignore deleted TODOs or other removed content
- Don't repeat items already listed in my log
- Format your response using Markdown
`;

async function main() {
  const n = process.argv[2] ?? 1;
  const res = await $`git diff --unified=10000 HEAD@{${n}.day.ago}`.quiet();
  const text = res.text();
  console.log(prompt.replace("{{DIFF}}", text));
}

main();
