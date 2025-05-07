# Project Guide

## Important Files
- **refactor-plan.md** - Contains the detailed plan for unifying CLI tools into a single `my` tool
- **todo.md** - Keep track of todos and progress in this file

## Code guidelines
- Use Bun for runtime
- Use Zod for runtime validation, explicit TypeScript types for interfaces
- Use kebab case for directories and files, camelCase for functions and variables, and PascalCase for classes 
- Use Commander.js for CLI command parsing
- Prefer a functional programming style
- No barrel files

## Reminders
- Check todo.md regularly to track tasks and update progress
- Follow the refactor plan structure when implementing components
- Run `bun run typecheck` before committing changes to check for TypeScript errors

## Project Setup Notes
- Using Commander.js for CLI command parsing
- Basic structure follows the refactor plan
- Config file located at ~/.config/my/config.json
- Command modules will be created in src/commands/
- Shared utilities in src/common/
- Services (like API clients) in src/services/

## Commands to Implement
- Top-level: script, path, sync, cd, ls
- Notes: note create, daily, weekly, monthly, diff, tail
- Todo: add, ls, done, edit, rm
- Calendar: add, agenda, ls, now, next, edit, done, rm
- AI: query, cmd