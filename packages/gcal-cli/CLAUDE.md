# Notes for Claude on gcal-cli

## Project Overview
- CLI tool for interacting with Google Calendar from the command line
- Built with TypeScript using Bun runtime
- Uses commander.js for CLI command structure
- Uses chrono-node for natural language date parsing
- Uses luxon for date/time handling
- Uses googleapis for Google Calendar and Tasks API interaction

## Key Commands
- `gcal ls`: List events with filtering options
- `gcal agenda`: Show agenda for a date range
- `gcal now`: See current/ongoing events
- `gcal next`: See next upcoming event
- `gcal add`: Add a new event (with natural language parsing)
- `gcal quick`: Quick add event with natural language
- `gcal edit`: Edit an event using $EDITOR
- `gcal rm`: Remove an event
- `gcal done`: Mark an event as done
- `gcal todo`: View and manage tasks with filtering options

## Code Structure
- Main entry point: `src/index.ts`
- Command definitions in `src/commands/` directory
- Auth handling in `src/auth.ts`
- Google API client in `src/google.ts`
- Time utilities in `src/time.ts`
- Editor functionality in `src/editor.ts`

## Authentication Flow
- Uses OAuth 2.0 for Google Calendar API
- Stores credentials in `~/.config/gcal-cli/tokens.json`
- Requires CLIENT_ID and CLIENT_SECRET env variables

## Command Implementation Pattern
- Each command is defined in its own file in `src/commands/`
- Commands use `commander` package and follow a consistent pattern
- Commands are registered in `src/index.ts`

## Important Implementation Details
- Default calendars: "Work Intentions", "Intentions"
- Intentions use "[ ]" prefix and can be marked as done
- Uses natural language parsing for date/time inputs
- Handles both events and tasks
- Time window options include:
  - `--today`, `--tomorrow`: Show items for specified day
  - `--this-week`, `--next-week`: Show items for Monday-Sunday of specified week
  - `--after`, `--before`: Show items in custom date range (--after defaults to now)
- Agenda view groups events by day with human-readable date headers
- The todo command provides dedicated task management features

## When Adding New Commands
1. Create a new file in `src/commands/`
2. Follow existing command structure pattern
3. Register command in `src/index.ts`
4. Update README and SPEC if necessary

## Linting/Building
- Use `bun run lint` or `bun run typecheck` before committing (check package.json for exact commands)
- Install globally with `bun link` 

## Testing
- Manual testing recommended for each command with real Google Calendar data
- Check if natural language parsing works as expected
- Ensure time zones are correctly handled