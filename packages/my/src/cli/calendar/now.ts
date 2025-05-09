import { Command } from "commander";
import { z } from "zod";
import chalk from "chalk";
import { an } from "../../lib/an";
import { getGoogleClients, listEvents } from "../../integrations/google";
import { formatTime } from "../../lib/date-time";

export const nowCommand = new Command("now")
  .description("Show current and upcoming events")
  .option("--hours <number>", "Number of hours to look ahead (default: 3)", "3")
  .option("--calendar <id>", "Calendar ID (defaults to primary)")
  .option("--show-ids", "Show event IDs")
  .action(
    an(
      z.tuple([z.object({
        hours: z.string().transform(val => parseInt(val)),
        calendar: z.string().optional(),
        showIds: z.boolean().optional()
      })]),
      async (options) => {
        try {
          // Get current time and calculate time range
          const now = new Date();
          const hoursAhead = options.hours || 3;
          
          // Look from 15 minutes ago (to see current events) to N hours ahead
          const timeMin = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
          const timeMax = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000).toISOString();
          
          // Get Google Calendar client
          const { calendar } = await getGoogleClients();
          const calendarId = options.calendar || "primary";
          
          // Get events
          const events = await listEvents(calendar, calendarId, timeMin, timeMax);
          
          // Display events
          if (events.length === 0) {
            console.log(chalk.yellow(`No events found in the next ${hoursAhead} hours.`));
            return;
          }
          
          const maxSummaryLength = events.reduce((max, event) => 
            Math.max(max, (event.summary || "(No title)").length), 0);
          
          console.log(chalk.bold(`Current and upcoming events (next ${hoursAhead} hours):`));
          console.log(chalk.gray("─".repeat(50)));
          
          // Sort events by start time
          events.sort((a, b) => {
            const aTime = a.start?.dateTime || a.start?.date || "";
            const bTime = b.start?.dateTime || b.start?.date || "";
            return aTime.localeCompare(bTime);
          });
          
          // Check for current events
          const currentEvents = events.filter(event => {
            if (!event.start?.dateTime || !event.end?.dateTime) return false;
            
            const startTime = new Date(event.start.dateTime);
            const endTime = new Date(event.end.dateTime);
            
            return startTime <= now && endTime >= now;
          });
          
          // Check for upcoming events
          const upcomingEvents = events.filter(event => {
            if (!event.start?.dateTime) return false;
            
            const startTime = new Date(event.start.dateTime);
            return startTime > now;
          });
          
          // Display current events
          if (currentEvents.length > 0) {
            console.log(chalk.green("\nHappening now:"));
            
            for (const event of currentEvents) {
              const summary = event.summary || "(No title)";
              const paddedSummary = summary.padEnd(maxSummaryLength);
              const idPart = options.showIds ? ` [${event.id}]` : "";
              
              // Calculate remaining time
              const endTime = new Date(event.end?.dateTime || "");
              const remainingMins = Math.floor((endTime.getTime() - now.getTime()) / (60 * 1000));
              const remainingText = remainingMins > 0 
                ? chalk.yellow(`(${remainingMins} min${remainingMins !== 1 ? 's' : ''} remaining)`) 
                : "";
              
              console.log(`  ${chalk.bold(paddedSummary)} ${remainingText}${idPart}`);
            }
          }
          
          // Display upcoming events
          if (upcomingEvents.length > 0) {
            console.log(chalk.blue("\nUpcoming:"));
            
            for (const event of upcomingEvents) {
              const summary = event.summary || "(No title)";
              const paddedSummary = summary.padEnd(maxSummaryLength);
              const idPart = options.showIds ? ` [${event.id}]` : "";
              
              // Calculate time until event
              const startTime = new Date(event.start?.dateTime || "");
              const startsIn = Math.floor((startTime.getTime() - now.getTime()) / (60 * 1000));
              const timeText = startsIn < 60 
                ? chalk.yellow(`in ${startsIn} min${startsIn !== 1 ? 's' : ''}`)
                : `at ${formatTime(startTime)}`;
              
              console.log(`  ${paddedSummary} ${timeText}${idPart}`);
            }
          }
          
          // If only all-day events are found
          if (currentEvents.length === 0 && upcomingEvents.length === 0) {
            console.log(chalk.yellow("\nAll-day events:"));
            
            for (const event of events) {
              const summary = event.summary || "(No title)";
              const idPart = options.showIds ? ` [${event.id}]` : "";
              console.log(`  ${summary}${idPart}`);
            }
          }
          
        } catch (error) {
          console.error(
            chalk.red(
              `Error displaying current events: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      }
    )
  );