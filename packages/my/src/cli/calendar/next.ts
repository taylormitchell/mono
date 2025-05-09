import { Command } from "commander";
import { z } from "zod";
import chalk from "chalk";
import { an } from "../../lib/an";
import { getGoogleClients, listEvents } from "../../integrations/google";
import { formatTime, formatDate } from "../../lib/date-time";

export const nextCommand = new Command("next")
  .description("Show the next scheduled event")
  .option("--calendar <id>", "Calendar ID (defaults to primary)")
  .option("--show-id", "Show event ID")
  .action(
    an(
      z.tuple([z.object({
        calendar: z.string().optional(),
        showId: z.boolean().optional()
      })]),
      async (options) => {
        try {
          // Get current time
          const now = new Date();
          
          // Set time range: from now to the end of the day
          const timeMin = now.toISOString();
          const endOfDay = new Date(now);
          endOfDay.setHours(23, 59, 59, 999);
          const timeMax = endOfDay.toISOString();
          
          // Get Google Calendar client
          const { calendar } = await getGoogleClients();
          const calendarId = options.calendar || "primary";
          
          // Get upcoming events
          const events = await listEvents(calendar, calendarId, timeMin, timeMax, 10);
          
          // Filter out all-day events and sort by start time
          const timedEvents = events
            .filter(event => event.start?.dateTime) // Only include events with a specific time
            .sort((a, b) => {
              const aTime = a.start?.dateTime || "";
              const bTime = b.start?.dateTime || "";
              return aTime.localeCompare(bTime);
            });
          
          // Check if we found any events
          if (timedEvents.length === 0) {
            // Check if there are any all-day events
            const allDayEvents = events.filter(event => !event.start?.dateTime && event.start?.date);
            
            if (allDayEvents.length > 0) {
              console.log(chalk.yellow("No timed events left for today, but there are all-day events:"));
              allDayEvents.forEach(event => {
                const idPart = options.showId ? ` [${event.id}]` : "";
                console.log(`  ${event.summary || "(No title)"}${idPart}`);
              });
            } else {
              console.log(chalk.yellow("No more events scheduled for today."));
            }
            return;
          }
          
          // Get the next event
          const nextEvent = timedEvents[0];
          
          // Calculate time until event
          const startTime = new Date(nextEvent.start?.dateTime || "");
          const minutesUntil = Math.floor((startTime.getTime() - now.getTime()) / (60 * 1000));
          const hoursUntil = Math.floor(minutesUntil / 60);
          const remainingMinutes = minutesUntil % 60;
          
          // Format time until event
          let timeUntil = "";
          if (hoursUntil > 0) {
            timeUntil += `${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''}`;
          }
          if (remainingMinutes > 0 || hoursUntil === 0) {
            if (hoursUntil > 0) timeUntil += " and ";
            timeUntil += `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
          }
          
          // Display next event details
          console.log(chalk.bold("Next event:"));
          console.log(chalk.gray("─".repeat(30)));
          
          console.log(`${chalk.blue("Title:")}   ${nextEvent.summary || "(No title)"}`);
          console.log(`${chalk.blue("When:")}    ${formatTime(startTime)} (in ${timeUntil})`);
          
          if (nextEvent.location) {
            console.log(`${chalk.blue("Where:")}   ${nextEvent.location}`);
          }
          
          if (nextEvent.description) {
            console.log(`${chalk.blue("Details:")} ${nextEvent.description.substring(0, 100)}${
              nextEvent.description.length > 100 ? "..." : ""
            }`);
          }
          
          if (options.showId && nextEvent.id) {
            console.log(`${chalk.blue("ID:")}      ${nextEvent.id}`);
          }
          
          // List other upcoming events
          if (timedEvents.length > 1) {
            console.log(chalk.bold("\nOther upcoming events today:"));
            
            for (let i = 1; i < timedEvents.length; i++) {
              const event = timedEvents[i];
              const eventTime = new Date(event.start?.dateTime || "");
              const idPart = options.showId ? ` [${event.id}]` : "";
              
              console.log(`  ${formatTime(eventTime)} - ${event.summary || "(No title)"}${idPart}`);
            }
          }
          
        } catch (error) {
          console.error(
            chalk.red(
              `Error finding next event: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      }
    )
  );