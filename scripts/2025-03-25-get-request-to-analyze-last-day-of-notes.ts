import { $ } from "bun";

const prompt = `
Please analyze the following git diff of my personal notes from the last {{N}} days and provide a concise, bulleted summary.

\`\`\`
{{DIFF}}
\`\`\`

Focus on these key areas:

## Key Information
- Important concepts, ideas, or information captured
- Notable patterns or connections between topics

## People
- Information about people in my life, be it important or just fun tidbits

## Questions and Uncertainties
- Explicitly noted questions
- Areas needing further exploration

## Action Items
- New TODOs created
- Next steps based on notes
- Mentioned deadlines

Notes:
- Ignore deleted TODOs or other removed content
- Don't repeat items already listed in my log
- Format your response using Markdown
`;

async function main() {
  const n = process.argv[2] || "1";
  const res = await $`git diff --unified=10000 HEAD@{${n}.day.ago}`.quiet();
  const text = res.text();
  console.log(prompt.replace("{{N}}", n).replace("{{DIFF}}", text));
}

main();
