# My CLI Refactoring Todo List

## Phase 1: Project Setup & Core Infrastructure
- [x] Setup basic project structure following plan
- [x] Configure TypeScript and Commander.js
- [x] Create config loader for `~/.config/my/config.json`
- [x] Setup shared utilities in `src/lib/`
- [x] Replace custom Git service with simple-git

## Phase 2: Top-Level Commands Migration
- [x] Implement `my script` command in `src/cli/script/`
- [x] Implement `my path` command in `src/cli/path/`
- [x] Implement `my sync` command in `src/cli/sync/`
- [x] Implement path resolution service for `cd` and `ls`
- [x] Implement `my cd` command in `src/cli/cd/`
- [x] Implement `my ls` command in `src/cli/ls/`
- [x] Create shell integration with index.sh

## Phase 3: Notes Management
### Create a note
- [x] Implement `my note [name]` command in `src/cli/note/`. The `daily`, `weekly`, and `monthly` are special cases of this command. 
Example usage:
- `my note` will create a note with the current date and time in the format `YYYY-MM-DD_HH-MM-SS_-0500.md`
- `my note some-name.md` will create a note with the name `some-name.md` 
- `my note daily` will create a note with the current date in the format `YYYY-MM-DD.md`
### Manage notes
- [x] Implement `my notes diff` command in `src/cli/notes/diff.ts`
- [x] Implement `my notes tail` command in `src/cli/notes/tail.ts`

## Phase 4: Google API Integration
- [x] Setup Google API client infrastructure in `src/integrations/google.ts`
- [x] Implement calendar service in `src/integrations/google.ts`
- [x] Implement tasks service in `src/integrations/google.ts`

## Phase 5: Calendar Management
- [x] Implement `my cal add` command in `src/cli/calendar/add.ts`
- [x] Implement `my cal agenda` command in `src/cli/calendar/agenda.ts`
- [x] Implement `my cal ls` command in `src/cli/calendar/ls.ts`
- [x] Implement `my cal now` command in `src/cli/calendar/now.ts`
- [x] Implement `my cal next` command in `src/cli/calendar/next.ts`
- [x] Implement `my cal edit` command in `src/cli/calendar/edit.ts`
- [x] Implement `my cal done` command in `src/cli/calendar/done.ts`
- [x] Implement `my cal rm` command in `src/cli/calendar/rm.ts`

## Phase 6: Todo Management
- [x] Implement `my todo add` command in `src/cli/todo/add.ts`
- [x] Implement `my todo ls` command in `src/cli/todo/ls.ts`
- [x] Implement `my todo done` command in `src/cli/todo/done.ts`
- [x] Implement `my todo edit` command in `src/cli/todo/edit.ts`
- [x] Implement `my todo rm` command in `src/cli/todo/rm.ts`

## Phase 7: AI Integration
- [x] Setup OpenAI service in `src/integrations/openai.ts`
- [x] Implement `my ask` command to use GPT-4o-mini to answer questions
- [x] Implement `my cmd` command to use GPT-4o-mini to generate a command to run

## Phase 8: Testing & Documentation
- [ ] Create unit tests for core functionality
- [ ] Test integration with shell wrapper
- [ ] Create README with usage instructions
- [ ] Document shell wrapper requirements and example
- [ ] Create release plan

## Phase 9: Migration & Release
- [ ] Create installation instructions
- [ ] Deprecation notices for old CLI tools
- [ ] Final testing across all commands
- [ ] Release v1.0