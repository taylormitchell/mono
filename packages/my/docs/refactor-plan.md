# Plan: Unified CLI Tool

This document outlines the plan to refactor `mono-cli` (aliased as `my`), `kb`, and `gcal-cli` into a single, cohesive command-line interface.

## 1. New Tool Name and Alias

*   **Name**: `my`
*   **Alias**: `my` (The command itself will be `my`)

## 2. Core Functionality & Proposed Command Structure

The new tool will integrate functionalities from the existing CLIs, with a focus on frequently used top-level commands and clear subcommands. It will also be designed to work in conjunction with a shell wrapper (like in `.zprofile`) for functionalities like changing directories and opening editors.

### 2.1. Top-Level Commands & Utilities

Many of these will be supported by a shell wrapper for full functionality (e.g., `cd`, opening editors). The CLI's role is to provide the necessary information (paths, etc.).

*   `my script <type>`: Creates a new script file (e.g., `.js`, `.sh`). The CLI creates the file and outputs its path. The shell wrapper can then open it in an editor. (Was `my script <type>` in `mono-cli` and previously `my project create script <type>`).
*   `my cd <name_or_query>`: The CLI part resolves `<name_or_query>` to a directory path (e.g., by searching notes, packages, or predefined locations using BFS or heuristics). It then prints this path. The shell wrapper (e.g., in `.zprofile`) will use this output to execute the actual `cd` command.
*   `my ls [path_or_query]`: Lists files/directories. If `path_or_query` is provided, it can search or list a specific location. If empty, it might default to the current directory or a smart monorepo-aware listing.
*   `my path <name>`: Prints the full path to a predefined named folder (e.g., `notes`, a specific package, or other configured locations). The shell wrapper can use this for `cd $(my path <name>)`. (Was `my path <name>` in `mono-cli`).
*   `my sync`: Performs `git pull` followed by `git push` on the configured notes repository.

### 2.2. Notes Management (Subcommands under `my note`)

*   `my note create [filename] [-m <message>]`: (Moved from `my note create` to top-level for consistency if preferred, or can remain `my note create`). Creates a new note. The CLI creates the file and outputs its path. The shell wrapper can then open it. (Was `my note` in `mono-cli`).
*   `my note daily [dateOrOffset]` (was `kb daily`)
*   `my note weekly [dateOrOffset]` (was `kb weekly`)
*   `my note monthly` (was `kb monthly`)
*   `my note diff [days]` (was `my notes diff` in `mono-cli`) - git diff analysis
*   `my note tail [n]` (was `kb tail`) - show last modified notes (needs review/fixing)

### 2.3. Todo Management (integrating `gcal-cli` task features under `my todo`)

All todo management will be handled via Google Tasks. The underlying service (Google Tasks) will be an implementation detail. Markdown-based todo parsing from `kb` will be removed.

*   `my todo add "<description>" [--due <date>] [--list <list_name>] ...]` (adapts `gcal add` for tasks, `gcal todo`)
*   `my todo ls [--list <list_name>] [--due <date>] [--contains <text>] ...]` (adapts `gcal ls` for tasks, `gcal todo`)
*   `my todo done <id_or_text_query>]` (adapts `gcal done` for tasks, `gcal todo`)
*   `my todo edit <id_or_text_query> --description <new_desc> ...]` (adapts `gcal edit` for tasks, `gcal todo`)
*   `my todo rm <id_or_text_query>]` (adapts `gcal rm` for tasks, `gcal todo`)

(Note: `kb todo`, `kb todo sm`, `kb todo todo`, and `kb todo2` functionalities will be discontinued).

### 2.4. Calendar Management (from `gcal-cli` under `my cal`)

*   `my cal add "<text>"` (was `gcal add` for events)
*   `my cal agenda [options]` (was `gcal agenda`)
*   `my cal ls [options]` (was `gcal ls` for events)
*   `my cal now [options]` (was `gcal now` for events)
*   `my cal next [options]` (was `gcal next` for events)
*   `my cal edit <id>` (was `gcal edit` for events)
*   `my cal done <id>` (was `gcal done` for events - this will now *only* affect calendar events)
*   `my cal rm <id>` (was `gcal rm` for events)

### 2.5. AI Integration (from `mono-cli` under `my ai`)

*   `my ai query <text>` (was `my ai [query]`)
*   `my ai cmd <natural-language-command>` (was `my ai cmd <query>`)

### 2.6. Knowledge Base / Metadata (Functionality Removed)
The `kb init`, `kb update`, `kb save`, and `kb status` commands related to git-based file metadata tracking are no longer required and will be removed.

## 3. Configuration

*   A single configuration file will be located at: `~/.config/my/config.json`.
*   This file will consolidate settings from `.myrc.json` (existing for `mono-cli`), `.kbrc.json` (from `kb`), and Google API credential paths.

## 4. Technical Stack

*   **Language**: TypeScript
*   **Runtime**: Bun
*   **Command Parsing**: Commander.js
*   **Directory Structure (New Project - e.g., `my`):**
    ```
    my/
    ├── src/
    │   ├── cli/
    │   │   ├── index.ts  (main CLI entry point, registers all commands)
    │   │   ├── cd/       (for cd command)
    │   │   ├── ls/       (for ls command)
    │   │   ├── path/     (for path command)
    │   │   ├── script/   (for script command)
    │   │   ├── sync/     (for sync command)
    │   │   ├── note/     (for note subcommands like create, daily, weekly, etc.)
    │   │   ├── todo/     (for Google Tasks integration)
    │   │   ├── calendar/ (for Google Calendar integration)
    │   │   └── ai/       (for AI integration)
    │   ├── lib/ (shared utilities, types, config loader, git interaction for sync)
    │   └── services/ (service implementations like git, AI, etc.)
    ├── index.sh (shell script that must be sourced for shell integration)
    ├── package.json
    ├── tsconfig.json
    ├── bun.lockb
    └── README.md
    ```

## 5. Refactoring and Migration Plan

1.  **Setup New Project**: Create the `my` project with the proposed structure.
2.  **Shell Wrapper Consideration**: Throughout the migration, keep in mind that commands like `my cd`, `my script` (for opening in editor), and `my note create` (for opening) will rely on a shell wrapper. The TypeScript CLI's primary role for these is to compute and output the relevant path or information.
3.  **Core Modules First**:
    *   Migrate shared utilities (date handling, fs ops, config loader) to `my/src/lib/`.
    *   Develop/migrate Git interaction logic for `my sync` into `my/src/services/gitService.ts` (or similar).
    *   Adapt OpenAI logic from `mono-cli` into `my/src/services/aiService.ts` and `my/src/cli/ai/`.
4.  **Migrate `mono-cli` features to Top-Level and `my note`**:
    *   `script` to `my/src/cli/script/`.
    *   `path` to `my/src/cli/path/`.
    *   `note create` to `my/src/cli/note/`.
    *   `notes diff` to `my/src/cli/note/diff/`.
5.  **Migrate `kb` features (Notes only)**:
    *   Transfer note management (`daily`, `weekly`, `monthly`, `post`, `today`, `kb root` as `my note root`) to `my/src/cli/note/`.
    *   `kb tail` to `my/src/cli/note/tail/`.
    *   Git-based metadata commands (`kb init, update, save, status`) and Markdown todo functionalities will *not* be migrated.
6.  **Implement New Top-Level Commands**:
    *   `my cd`: Logic for path resolution in `my/src/services/` and command in `my/src/cli/cd/`.
    *   `my ls`: Logic for path resolution/listing in `my/src/services/` and command in `my/src/cli/ls/`.
    *   `my sync`: Command in `my/src/cli/sync/` using the git service.
7.  **Migrate `gcal-cli` features**:
    *   Google API client setup to `my/src/services/googleClient.ts`.
    *   Calendar commands to `my/src/cli/calendar/`.
    *   Google Tasks commands to `my/src/cli/todo/`.
8.  **Command Registration**: Wire up all commands in `my/src/cli/index.ts`.
9.  **Configuration Handling**: Implement the new config system using `~/.config/my/config.json`.
10. **Testing**: Incrementally test, including interaction with a prototype shell wrapper.
11. **Documentation**: Update/create README for `my` and document the shell wrapper requirements/example.

## 6. Key Decisions & Open Questions

*   **Final Tool Name & Alias**: Decided: `my` / `my`.
*   **Todo System Integration**: Decided: Google Tasks only, under `my todo`. Markdown todos removed.
*   **`my cal done` command scope**: Clarified: Affects *only* calendar events.
*   **Shell Wrapper Interplay**: Acknowledged: CLI provides data (paths), shell wrapper acts (cd, open editor). This needs clear documentation.

This plan is evolving and should provide a solid foundation.
