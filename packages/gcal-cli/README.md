# gcal‑cli

A command‑line tool for Google Calendar & Tasks, letting you create, list, edit, and manage events and tasks from the terminal.

## Prerequisites
- bun (or Node.js >=14) and TypeScript support
- Google API OAuth2 credentials: set environment variables `CLIENT_ID` and `CLIENT_SECRET`
- (Optional) Set `EDITOR` environment variable for the `edit` command (defaults to `vi`)

## Installation
Clone this repository and install dependencies:
```bash
bun install    # or npm install
bun link       # make `gcal` available globally via bun
```
Or install from npm:
```bash
npm install -g gcal-cli
```

## Authentication
On first run, any command needing Google access will open your browser to authorize. Paste the code back into the prompt. Credentials are stored in `~/.config/gcal-cli/tokens.json`.

## Usage
Run `gcal --help` to see global options.
Each subcommand supports `--account <name>` to select a credential profile.

### Commands
- `gcal add "<text>"`         Create an event via natural language (e.g. `gcal add "Meet Bob tomorrow at 3pm"`)
- `gcal agenda [options]`      Show events & tasks in a date window (`--today`, `--tomorrow`, `--after`, `--before`)
- `gcal ls [options]`          List events & tasks with filters (date range, `--contains`)
- `gcal now [options]`         Show the event or task happening right now
- `gcal next [options]`        Show the next upcoming event or timed task
- `gcal edit <id>`             Edit an event in your `$EDITOR`
- `gcal done <id>`             Mark an event or task as done/completed
- `gcal rm <id>`               Delete an event or task

### Examples
```bash
gcal add "Plan project kickoff tomorrow at 10am"
gcal agenda --today
gcal now
gcal next --cal Personal
gcal ls --contains "report"
gcal edit evt_12345
gcal done evt_12345
gcal rm task_67890
```