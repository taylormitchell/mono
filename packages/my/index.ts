#!/usr/bin/env bun
import { program } from 'commander';
import chalk from 'chalk';

// Create the program
program
  .name('my')
  .description('Unified CLI tool for personal productivity')
  .version('0.1.0');

// Import command modules when they're created
// Example: import { registerScriptCommand } from './src/commands/top_level/script';

// Register commands
// Example: registerScriptCommand(program);

// Error handling for unknown commands
program.on('command:*', () => {
  console.error(chalk.red(`Error: unknown command "${program.args.join(' ')}"`));
  console.log(`See ${chalk.green('--help')} for a list of available commands.`);
  process.exit(1);
});

// Parse command line arguments
program.parse();