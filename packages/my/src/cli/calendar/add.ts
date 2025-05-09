import { Command } from "commander";
import { z } from "zod";
import chalk from "chalk";
import { an } from "../../lib/an";
import { getGoogleClients, createEvent } from "../../integrations/google";
import { parseDate, toISOString } from "../../lib/date-time";

export const addCommand = new Command("add")
  .description("Add a new calendar event")
  .argument("<text...>", "Event description with optional time/date")
  .option("-i, --intention", "Prefix title with [ ] to mark as intention")
  .option("-c, --calendar <id>", "Calendar ID (defaults to primary)")
  .action(
    an(
      z.tuple([z.array(z.string()).min(1), z.object({ 
        intention: z.boolean().optional(),
        calendar: z.string().optional()
      })]),
      async (textArray, options) => {
        try {
          const text = textArray.join(" ");
          
          // Try to extract date and time information from the text
          const date = parseDate(text);
          
          // Default end time (15 minutes after start)
          const end = new Date(date.getTime() + 15 * 60 * 1000);
          
          // Get Google Calendar client
          const { calendar } = await getGoogleClients();
          
          // Format title (optionally with intention marker)
          const title = options.intention ? `[ ] ${text}` : text;
          
          // Create the event
          const event = await createEvent(
            calendar,
            {
              summary: title,
              start: { dateTime: toISOString(date) },
              end: { dateTime: toISOString(end) }
            },
            options.calendar || "primary"
          );
          
          console.log(chalk.green("✓ Event added:"), event.summary);
          
        } catch (error) {
          console.error(
            chalk.red(
              `Error adding event: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      }
    )
  );