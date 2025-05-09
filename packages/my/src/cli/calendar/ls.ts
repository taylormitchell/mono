import { Command } from "commander";
import { z } from "zod";
import chalk from "chalk";
import { an } from "../../lib/an";
import { getGoogleClients, listEvents } from "../../integrations/google";
import { 
  getStartOfDay, 
  getEndOfDay, 
  parseDate, 
  getDateWithOffset,
  formatTime,
  formatDate
} from "../../lib/date-time";

export const lsCommand = new Command("ls")
  .description("List calendar events")
  .option("--today", "List events for today (default)")
  .option("--tomorrow", "List events for tomorrow")
  .option("--week", "List events for current week")
  .option("--after <date>", "List events after this date/time")
  .option("--before <date>", "List events before this date/time")
  .option("--days <number>", "Number of days to list (default: 1)")
  .option("--limit <number>", "Maximum number of events to list (default: 10)")
  .option("--calendar <id>", "Calendar ID (defaults to primary)")
  .option("--show-ids", "Show event IDs")
  .action(
    an(
      z.tuple([z.object({
        today: z.boolean().optional(),
        tomorrow: z.boolean().optional(),
        week: z.boolean().optional(),
        after: z.string().optional(),
        before: z.string().optional(),
        days: z.string().optional().transform(val => val ? parseInt(val) : 1),
        limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
        calendar: z.string().optional(),
        showIds: z.boolean().optional()
      })]),
      async (options) => {
        try {
          // 1. Determine the time window based on options
          let timeMin: string;
          let timeMax: string;
          const now = new Date();
          
          if (options.week) {
            // Current week (starting from today)
            timeMin = getStartOfDay(now);
            timeMax = getEndOfDay(getDateWithOffset(6));
          } else if (options.after || options.before) {
            const afterDate = options.after ? parseDate(options.after) : now;
            const beforeDate = options.before ? parseDate(options.before) : null;
            
            timeMin = getStartOfDay(afterDate);
            
            if (beforeDate) {
              timeMax = getEndOfDay(beforeDate);
            } else {
              // If no before date specified, use days parameter
              const days = options.days || 1;
              timeMax = getEndOfDay(getDateWithOffset(days));
            }
          } else if (options.tomorrow) {
            const tomorrow = getDateWithOffset(1);
            timeMin = getStartOfDay(tomorrow);
            timeMax = getEndOfDay(tomorrow);
          } else {
            // Default to today
            timeMin = getStartOfDay(now);
            timeMax = getEndOfDay(now);
          }
          
          // 2. Get Google Calendar client and fetch events
          const { calendar } = await getGoogleClients();
          const calendarId = options.calendar || "primary";
          const maxResults = options.limit || 10;
          
          // Get events
          const events = await listEvents(calendar, calendarId, timeMin, timeMax, maxResults);
          
          // 3. Display events
          if (events.length === 0) {
            console.log(chalk.yellow("No events found in the specified time range."));
            return;
          }
          
          // Find maximum summary length for alignment
          const maxSummaryLength = events.reduce((max, event) => 
            Math.max(max, (event.summary || "(No title)").length), 0);
          
          // Determine date range for header
          const startDate = formatDate(new Date(timeMin));
          const endDate = formatDate(new Date(timeMax));
          const dateRange = startDate === endDate 
            ? `for ${startDate}` 
            : `from ${startDate} to ${endDate}`;
          
          console.log(chalk.bold(`Calendar events ${dateRange}:`));
          console.log(chalk.gray("─".repeat(50)));
          
          // Sort events by start time
          events.sort((a, b) => {
            const aTime = a.start?.dateTime || a.start?.date || "";
            const bTime = b.start?.dateTime || b.start?.date || "";
            return aTime.localeCompare(bTime);
          });
          
          // Display events
          for (const event of events) {
            const isAllDay = !!event.start?.date && !event.start?.dateTime;
            const startTime = isAllDay 
              ? "All-day  " 
              : formatTime(new Date(event.start?.dateTime || "")) + "  ";
            
            const summary = event.summary || "(No title)";
            const paddedSummary = summary.padEnd(maxSummaryLength);
            const idPart = options.showIds ? ` [${event.id}]` : "";
            
            // Get date if spanning multiple days
            const datePart = startDate !== endDate 
              ? ` (${formatDate(new Date(event.start?.dateTime || event.start?.date || ""))})` 
              : "";
              
            console.log(`${chalk.blue(startTime)} ${paddedSummary}${datePart}${idPart}`);
          }
          
        } catch (error) {
          console.error(
            chalk.red(
              `Error listing events: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      }
    )
  );