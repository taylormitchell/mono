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
- [ ] Implement `my note create` command in `src/cli/note/`
- [ ] Implement `my note daily` command in `src/cli/note/`
- [ ] Implement `my note weekly` command in `src/cli/note/`
- [ ] Implement `my note monthly` command in `src/cli/note/`
- [ ] Implement `my note diff` command in `src/cli/note/`
- [ ] Implement `my note tail` command in `src/cli/note/`

## Phase 4: Google API Integration
- [ ] Setup Google API client infrastructure in `src/services/`
- [ ] Implement calendar service in `src/services/`
- [ ] Implement tasks service in `src/services/`

## Phase 5: Calendar Management
- [ ] Implement `my cal add` command in `src/cli/calendar/`
- [ ] Implement `my cal agenda` command in `src/cli/calendar/`
- [ ] Implement `my cal ls` command in `src/cli/calendar/`
- [ ] Implement `my cal now` command in `src/cli/calendar/`
- [ ] Implement `my cal next` command in `src/cli/calendar/`
- [ ] Implement `my cal edit` command in `src/cli/calendar/`
- [ ] Implement `my cal done` command in `src/cli/calendar/`
- [ ] Implement `my cal rm` command in `src/cli/calendar/`

## Phase 6: Todo Management
- [ ] Implement `my todo add` command in `src/cli/todo/`
- [ ] Implement `my todo ls` command in `src/cli/todo/`
- [ ] Implement `my todo done` command in `src/cli/todo/`
- [ ] Implement `my todo edit` command in `src/cli/todo/`
- [ ] Implement `my todo rm` command in `src/cli/todo/`

## Phase 7: AI Integration
- [ ] Setup OpenAI service in `src/services/`
- [ ] Implement `my ai query` command in `src/cli/ai/`
- [ ] Implement `my ai cmd` command in `src/cli/ai/`

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