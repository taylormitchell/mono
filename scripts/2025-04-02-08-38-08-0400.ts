import * as fs from 'fs';
import * as path from 'path';

// Path to the notes directory
const NOTES_DIR = path.resolve(process.env.HOME || '', 'Code/notes/notes');
const ACTIVE_PROJECTS_FILE = path.join(NOTES_DIR, 'active-projects.md');

/**
 * Extracts markdown links from the given text
 */
function extractLinks(text: string): { title: string; path: string }[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links: { title: string; path: string }[] = [];
  let match;
  
  while ((match = linkRegex.exec(text)) !== null) {
    const title = match[1];
    let linkPath = match[2];
    
    // Remove any anchor fragments
    linkPath = linkPath.split('#')[0];
    
    links.push({
      title,
      path: linkPath
    });
  }
  
  return links;
}

/**
 * Resolves a relative file path based on the notes directory
 */
function resolveFilePath(filePath: string): string {
  if (filePath.startsWith('./')) {
    return path.join(NOTES_DIR, filePath.slice(2));
  }
  return path.join(NOTES_DIR, filePath);
}

/**
 * Main function to read active projects and their contents
 */
async function generateActiveProjectsPrompt() {
  try {
    // Read the active projects file
    const activeProjectsContent = fs.readFileSync(ACTIVE_PROJECTS_FILE, 'utf-8');
    
    // Extract links to other files
    const links = extractLinks(activeProjectsContent);
    
    // Initialize the full prompt
    let prompt = `# My Active Projects\n\nHere are my current active projects and their contents:\n\n`;
    prompt += `## Active Projects Overview\n\n${activeProjectsContent}\n\n`;
    
    // Read each linked file and add its contents to the prompt
    for (const link of links) {
      const filePath = resolveFilePath(link.path);
      
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          prompt += `\n\n## ${link.title}\n\nFile: \`${link.path}\`\n\n\`\`\`markdown\n${content}\n\`\`\``;
        } else {
          prompt += `\n\n## ${link.title}\n\nFile: \`${link.path}\`\n\n(File not found)`;
        }
      } catch (err) {
        prompt += `\n\n## ${link.title}\n\nFile: \`${link.path}\`\n\n(Error reading file: ${err.message})`;
      }
    }
    
    // Add instructions for AI
    prompt += `\n\n# Instructions for AI\n
Please review my active projects above and help me with:
1. Suggest tasks I should work on today related to shopify
2. Offering insights or suggestions for making progress on these projects\n`;
    
    console.log(prompt);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the main function
generateActiveProjectsPrompt();
