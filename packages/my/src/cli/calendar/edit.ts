import { Command } from "commander";
import { z } from "zod";
import chalk from "chalk";
import { an } from "../../lib/an";
import { getGoogleClients, updateEvent } from "../../integrations/google";
import { parseDate, toISOString } from "../../lib/date-time";

export const editCommand = new Command("edit")
  .description("Edit a calendar event")
  .argument("<id>", "Event ID to edit")
  .option("--title <title>", "New event title")
  .option("--description <desc>", "New event description")
  .option("--location <loc>", "New event location")
  .option("--start <datetime>", "New start time (natural language or ISO format)")
  .option("--end <datetime>", "New end time (natural language or ISO format)")
  .option("--calendar <id>", "Calendar ID (defaults to primary)")
  .action(
    an(
      z.tuple([z.string(), z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        start: z.string().optional(),
        end: z.string().optional(),
        calendar: z.string().optional()
      })]),
      async (eventId, options) => {
        try {
          // Check if any fields to update are provided
          if (!options.title && !options.description && !options.location && 
              !options.start && !options.end) {
            console.error(chalk.red("Error: At least one field to update must be specified."));
            console.log("Available fields: --title, --description, --location, --start, --end");
            process.exit(1);
          }
          
          // Get Google Calendar client
          const { calendar } = await getGoogleClients();
          const calendarId = options.calendar || "primary";
          
          // Prepare update object
          const updateObject: any = {};
          
          if (options.title) {
            updateObject.summary = options.title;
          }
          
          if (options.description) {
            updateObject.description = options.description;
          }
          
          if (options.location) {
            updateObject.location = options.location;
          }
          
          // Handle date-time updates
          if (options.start) {
            const startDate = parseDate(options.start);
            updateObject.start = { dateTime: toISOString(startDate) };
          }
          
          if (options.end) {
            const endDate = parseDate(options.end);
            updateObject.end = { dateTime: toISOString(endDate) };
          }
          
          // Update the event
          const updatedEvent = await updateEvent(
            calendar,
            eventId,
            updateObject,
            calendarId
          );
          
          console.log(chalk.green("✓ Event updated:"), updatedEvent.summary);
          
        } catch (error) {
          console.error(
            chalk.red(
              `Error updating event: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      }
    )
  );