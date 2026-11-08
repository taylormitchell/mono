import { Command } from "commander";
import { an } from "../../lib/an";
import { z } from "zod";
import chalk from "chalk";
import { getConfig } from "../../lib/config";
import { executeGit } from "../../integrations/git";

/**
 * Parses raw git diff output and returns a simplified format
 * showing only file paths and added content, separated by dashes
 */
function parseGitDiff(diffOutput: string): string {
  const lines = diffOutput.split('\n');
  const result: string[] = [];
  let currentFile = '';
  let addedLines: string[] = [];
  
  for (const line of lines) {
    // Check for new file being compared
    if (line.startsWith('diff --git')) {
      // If we have processed a file already, add it to the result
      if (currentFile && addedLines.length > 0) {
        result.push(currentFile);
        result.push(...addedLines);
        result.push('---');
      }
      
      // Extract the new file path (second file in the diff, which is the newer version)
      const match = line.match(/diff --git a\/(.+) b\/(.+)/);
      if (match && match[2]) {
        currentFile = `/${match[2]}`;
      }
      
      // Reset added lines for the new file
      addedLines = [];
    }
    // Collect only added lines (those starting with '+')
    else if (line.startsWith('+') && !line.startsWith('+++')) {
      addedLines.push(line);
    }
  }
  
  // Add the last file if there is one
  if (currentFile && addedLines.length > 0) {
    result.push(currentFile);
    result.push(...addedLines);
    result.push('---');
  }
  
  return result.join('\n');
}

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

export const diffCommand = new Command("diff")
  .description("Show git diff analysis of recent note changes")
  .argument("[days]", "Number of days to look back", "1")
  .action(
    an(
      z.tuple([
        z
          .string()
          .default("1")
          .transform((s) => parseInt(s)),
      ]),
      async (days) => {
        try {
          const config = getConfig();
          const notesDir = config.notesDir;

          if (!notesDir) {
            console.error(chalk.red("Notes directory not found in config"));
            process.exit(1);
          }

          // Show summary of changes
          const result = await executeGit([`diff HEAD@{${days}.day.ago}`], {
            cwd: notesDir,
          });

          if (result.success) {
            // Parse the git diff to a simplified format
            const simplifiedDiff = parseGitDiff(result.data);
            console.log(
              prompt.replace("{{DIFF}}", simplifiedDiff).replace("{{N}}", days.toString())
            );
          } else {
            console.log(chalk.red("Failed to execute git diff"));
          }
        } catch (error) {
          console.error(
            chalk.red(
              `Error running notes diff: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      }
    )
  );
