import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';
import * as readline from 'readline';
import { spawn } from 'child_process';

// Load environment variables from .env file
dotenv.config();

// Check if API key is available
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is not set in environment variables');
  console.log('Create a .env file with your OpenAI API key: OPENAI_API_KEY=your_key_here');
  process.exit(1);
}

// Configure OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt to instruct the model
const systemPrompt = `
You are a command line assistant. Convert natural language descriptions into the appropriate command line commands.
Only respond with the exact command that should be run, nothing else.
Do not include any explanations, markdown formatting, or backticks.
`;

async function getCommandSuggestion(query: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Using a cost-effective model that's still capable
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.3, // Lower temperature for more deterministic responses
      max_tokens: 100, // Limit token usage to keep costs down
    });

    if (response.choices[0]?.message?.content) {
      return response.choices[0].message.content.trim();
    } else {
      return 'No command suggestion available.';
    }
  } catch (error) {
    console.error('Error getting command suggestion:', error);
    return 'Error occurred while getting command suggestion.';
  }
}

async function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function executeCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    // Split the command into the base command and arguments
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);
    
    // Use spawn instead of execSync for better terminal handling
    const childProcess = spawn(cmd, args, {
      stdio: 'inherit', // This connects the child's stdin/stdout/stderr to the parent
      shell: true // Use shell to support pipes and redirects
    });
    
    childProcess.on('close', (code) => {
      if (code === 0 || code === null) {
        resolve();
      } else {
        console.error(`Command exited with code ${code}`);
        resolve(); // Still resolve to continue script execution
      }
    });
    
    childProcess.on('error', (err) => {
      console.error('Error executing command:', err.message);
      resolve(); // Still resolve to continue script execution
    });
  });
}

// Non-interactive mode - just output the command and exit
async function nonInteractiveMode(query: string): Promise<void> {
  const command = await getCommandSuggestion(query);
  console.log(command);
}

// Interactive mode - prompt to execute the command
async function interactiveMode(query: string): Promise<void> {
  const command = await getCommandSuggestion(query);
  console.log(`Suggested command: ${command}`);
  
  const response = await promptUser('Execute this command? (y/n): ');
  
  if (response.toLowerCase() === 'y' || response.toLowerCase() === 'yes') {
    await executeCommand(command);
  } else {
    console.log('Command execution cancelled.');
  }
}

async function main() {
  // Get the query from command line arguments
  const query = process.argv.slice(2).join(' ');
  
  if (!query) {
    console.error('Please provide a command description.');
    console.error('Usage: bun cli-helper.ts "your command description here"');
    process.exit(1);
  }
  
  // CHOOSE YOUR MODE HERE:
  // Comment out one of these lines to use the other mode
  
  // For non-interactive mode (just output the command and exit):
  await nonInteractiveMode(query);
  
  // For interactive mode (prompt to execute the command):
  // await interactiveMode(query);
}

main().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
});
