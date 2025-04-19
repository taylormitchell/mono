TODOs:
- [x] By default, --after should be now. So if I so `gcal agenda --before '7 days'` itll give me to next week
- [x] When in agenda view with multiple days, each day should have a human readable date above it which includes day of the week
- [x] Add shortcuts --this-week and --next-week which shows the 7 days from Monday to Sunday in the current week or next week
- [x] More ways to view todos. I'm not sure what this should be. Use judgement based on what you know todo apps should have.
  - Added a new dedicated `gcal todo` command with various filtering options
  - Supports filtering by time (today, tomorrow, this week, next week)
  - Supports filtering by status (overdue, no due date, all)
  - Groups tasks by date with clear date headers
  - Shows tasks with and without due dates in separate sections