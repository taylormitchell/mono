# Project Guide

## Important Files
- **refactor-plan.md** - Contains the detailed plan for unifying CLI tools into a single `my` tool
- **todo.md** - Keep track of todos and progress in this file
- **index.sh** - Main entry point shell script that handles shell-specific operations
- **index.ts** - TypeScript entry point for the CLI

## Code guidelines
- Use Bun for runtime
- Use Zod for runtime validation, explicit TypeScript types for interfaces
- Validate command line arguments using `fn` from `src/lib/utils.ts`
- Use kebab case for directories and files, camelCase for functions and variables, and PascalCase for classes 
- Use Commander.js for CLI command parsing
- Prefer a functional programming style
- No barrel files

## Shell Integration
The CLI uses a hybrid approach for commands that need shell integration:

1. **index.sh** - Main shell script entry point that:
   - Handles commands that require shell capabilities (`cd`, opening files in editors)
   - Delegates to the TypeScript code for everything else
   - Manages the preferred editor selection

2. **TypeScript commands** that need shell integration:
   - Output paths or other data that the shell script can use
   - Don't try to do things that require shell capabilities directly

This approach allows for proper directory changes and file opening while maintaining most logic in TypeScript.

## Reminders
- Check todo.md regularly to track tasks and update progress
- Follow the refactor plan structure when implementing components
- Run `bun run typecheck` before committing changes to check for TypeScript errors
- **IMPORTANT: Check existing code in the symlinks directory before implementing commands**
- Port existing functionality from symlinks rather than reimplementing from scratch

## Project Setup Notes
- Using Commander.js for CLI command parsing
- Basic structure follows the refactor plan
- Config file located at ~/.config/my/config.json
- Command modules will be created in src/commands/
- Shared utilities in src/lib/
- Services (like API clients) in src/services/

## Commands to Implement
- Top-level: script, path, sync, cd, ls
- Notes: note create, daily, weekly, monthly, diff, tail
- Todo: add, ls, done, edit, rm
- Calendar: add, agenda, ls, now, next, edit, done, rm
- AI: query, cmd