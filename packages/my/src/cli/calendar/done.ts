import { Command } from "commander";
import { z } from "zod";
import chalk from "chalk";
import { an } from "../../lib/an";
import { getGoogleClients, updateEvent } from "../../integrations/google";

export const doneCommand = new Command("done")
  .description("Mark a calendar event as completed")
  .argument("<id>", "Event ID to mark as done")
  .option("--calendar <id>", "Calendar ID (defaults to primary)")
  .action(
    an(
      z.tuple([z.string(), z.object({
        calendar: z.string().optional()
      })]),
      async (eventId, options) => {
        try {
          // Get Google Calendar client
          const { calendar } = await getGoogleClients();
          const calendarId = options.calendar || "primary";
          
          // First get the current event to preserve its properties
          const event = await calendar.events.get({
            calendarId,
            eventId
          });
          
          if (!event.data) {
            console.error(chalk.red(`Event with ID ${eventId} not found.`));
            process.exit(1);
          }
          
          // Update the event title to mark as done
          const currentTitle = event.data.summary || "";
          let newTitle = currentTitle;
          
          // If title already starts with "✓ ", don't add it again
          if (!currentTitle.startsWith("✓ ")) {
            newTitle = `✓ ${currentTitle}`;
          }
          
          // Also add completed status to event
          const updatedEvent = await updateEvent(
            calendar,
            eventId,
            {
              summary: newTitle,
              colorId: "2", // Green color
              status: "confirmed"
            },
            calendarId
          );
          
          console.log(chalk.green("✓ Event marked as completed:"), updatedEvent.summary);
          
        } catch (error) {
          console.error(
            chalk.red(
              `Error marking event as done: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      }
    )
  );