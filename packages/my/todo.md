# My CLI Refactoring Todo List

## Phase 1: Project Setup & Core Infrastructure
- [ ] Setup basic project structure following plan
- [ ] Configure TypeScript and Commander.js
- [ ] Create config loader for `~/.config/my/config.json`
- [ ] Setup shared utilities in `src/common/`
- [ ] Create basic Git interaction service for sync command

## Phase 2: Top-Level Commands Migration
- [ ] Implement `my script` command
- [ ] Implement `my path` command
- [ ] Implement `my sync` command
- [ ] Implement path resolution service for `cd` and `ls`
- [ ] Implement `my cd` command
- [ ] Implement `my ls` command

## Phase 3: Notes Management
- [ ] Implement `my note create` command
- [ ] Implement `my note daily` command
- [ ] Implement `my note weekly` command
- [ ] Implement `my note monthly` command
- [ ] Implement `my note diff` command
- [ ] Implement `my note tail` command

## Phase 4: Google API Integration
- [ ] Setup Google API client infrastructure
- [ ] Implement calendar service
- [ ] Implement tasks service

## Phase 5: Calendar Management
- [ ] Implement `my cal add` command
- [ ] Implement `my cal agenda` command
- [ ] Implement `my cal ls` command
- [ ] Implement `my cal now` command
- [ ] Implement `my cal next` command
- [ ] Implement `my cal edit` command
- [ ] Implement `my cal done` command
- [ ] Implement `my cal rm` command

## Phase 6: Todo Management
- [ ] Implement `my todo add` command
- [ ] Implement `my todo ls` command
- [ ] Implement `my todo done` command
- [ ] Implement `my todo edit` command
- [ ] Implement `my todo rm` command

## Phase 7: AI Integration
- [ ] Setup OpenAI service
- [ ] Implement `my ai query` command
- [ ] Implement `my ai cmd` command

## Phase 8: Testing & Documentation
- [ ] Create unit tests for core functionality
- [ ] Test integration with shell wrapper
- [ ] Create README with usage instructions
- [ ] Document shell wrapper requirements and example
- [ ] Create release plan

## Phase 9: Migration & Release
- [ ] Create shell wrapper for zsh/bash
- [ ] Deprecation notices for old CLI tools
- [ ] Final testing across all commands
- [ ] Release v1.0