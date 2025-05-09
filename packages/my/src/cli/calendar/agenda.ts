import { Command } from "commander";
import { z } from "zod";
import chalk from "chalk";
import { an } from "../../lib/an";
import { getGoogleClients, listEvents, listTasks } from "../../integrations/google";
import { 
  getStartOfDay, 
  getEndOfDay, 
  parseDate, 
  getDateWithOffset,
  formatTime
} from "../../lib/date-time";

// Format a date header for display
function formatDateHeader(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

export const agendaCommand = new Command("agenda")
  .description("Show calendar events and tasks for a time period")
  .option("--today", "Show agenda for today (default)")
  .option("--tomorrow", "Show agenda for tomorrow")
  .option("--this-week", "Show agenda for current week (Mon-Sun)")
  .option("--next-week", "Show agenda for next week (Mon-Sun)")
  .option("--after <date>", "Show agenda after this date/time")
  .option("--before <date>", "Show agenda before this date/time")
  .option("--calendar <id>", "Calendar ID (defaults to primary)")
  .option("--show-ids", "Show event and task IDs")
  .action(
    an(
      z.tuple([z.object({
        today: z.boolean().optional(),
        tomorrow: z.boolean().optional(),
        thisWeek: z.boolean().optional(),
        nextWeek: z.boolean().optional(),
        after: z.string().optional(),
        before: z.string().optional(),
        calendar: z.string().optional(),
        showIds: z.boolean().optional()
      })]),
      async (options) => {
        try {
          // 1. Determine the time window based on options
          let timeMin: string;
          let timeMax: string;
          const now = new Date();
          
          if (options.thisWeek) {
            // Current week (starting from Monday)
            const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
            const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const monday = getDateWithOffset(daysToMonday);
            const sunday = getDateWithOffset(daysToMonday + 6);
            timeMin = getStartOfDay(monday);
            timeMax = getEndOfDay(sunday);
          } else if (options.nextWeek) {
            // Next week (starting from next Monday)
            const dayOfWeek = now.getDay();
            const daysToNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
            const nextMonday = getDateWithOffset(daysToNextMonday);
            const nextSunday = getDateWithOffset(daysToNextMonday + 6);
            timeMin = getStartOfDay(nextMonday);
            timeMax = getEndOfDay(nextSunday);
          } else if (options.after || options.before) {
            const afterDate = options.after ? parseDate(options.after) : now;
            const beforeDate = options.before ? parseDate(options.before) : getDateWithOffset(1);
            timeMin = getStartOfDay(afterDate);
            timeMax = getEndOfDay(beforeDate);
          } else if (options.tomorrow) {
            const tomorrow = getDateWithOffset(1);
            timeMin = getStartOfDay(tomorrow);
            timeMax = getEndOfDay(tomorrow);
          } else {
            // Default to today's agenda
            timeMin = getStartOfDay(now);
            timeMax = getEndOfDay(now);
          }
          
          // 2. Get the Google clients and fetch events
          const { calendar, tasks } = await getGoogleClients();
          const calendarId = options.calendar || "primary";
          
          // Get events
          const events = await listEvents(calendar, calendarId, timeMin, timeMax);
          
          // Get tasks (with dueMax = timeMax)
          const taskList = await listTasks(tasks, "@default", false, 100);
          
          // 3. Prepare data for display
          type AgendaItem = {
            type: "event" | "task";
            id: string;
            title: string;
            startTime?: string;
            dueDate?: string;
            isAllDay: boolean;
          };
          
          const items: AgendaItem[] = [];
          
          // Process events
          for (const event of events) {
            const isAllDay = !!event.start?.date && !event.start?.dateTime;
            
            items.push({
              type: "event",
              id: event.id || "",
              title: event.summary || "(No title)",
              startTime: event.start?.dateTime || event.start?.date || "",
              isAllDay
            });
          }
          
          // Process tasks (only include tasks with due dates in our time range)
          for (const task of taskList) {
            // Skip tasks without due dates
            if (!task.due) continue;
            
            // Extract date part from due date
            const dueDate = task.due.split('T')[0];
            const dueDateTime = new Date(task.due);
            
            // Only include if due date is within our time range
            if (dueDateTime >= new Date(timeMin) && dueDateTime <= new Date(timeMax)) {
              items.push({
                type: "task",
                id: task.id || "",
                title: task.title || "(No title)",
                dueDate,
                isAllDay: true
              });
            }
          }
          
          // 4. Group items by day and sort
          const itemsByDay: Record<string, AgendaItem[]> = {};
          
          for (const item of items) {
            // Get the date part only
            const date = item.type === "event" 
              ? (item.startTime?.split('T')[0] || "")
              : (item.dueDate || "");
              
            if (!date) continue;
            
            if (!itemsByDay[date]) {
              itemsByDay[date] = [];
            }
            
            itemsByDay[date].push(item);
          }
          
          // 5. Display agenda
          if (Object.keys(itemsByDay).length === 0) {
            console.log(chalk.yellow("No events or tasks found in the specified time range."));
            return;
          }
          
          console.log(); // Empty line for better readability
          
          // Find maximum title length for alignment
          const maxTitleLength = items.reduce((max, item) => 
            Math.max(max, item.title.length), 0);
          
          // Display items grouped by day
          for (const date of Object.keys(itemsByDay).sort()) {
            // Print date header
            const header = formatDateHeader(date);
            console.log(chalk.bold(header));
            console.log(chalk.gray("─".repeat(header.length)));
            
            // Sort items: first events by time (all-day at top), then tasks
            const dayItems = itemsByDay[date].sort((a, b) => {
              // All-day events go first
              if (a.isAllDay && !b.isAllDay) return -1;
              if (!a.isAllDay && b.isAllDay) return 1;
              
              // Then sort by start time
              if (a.type === "event" && b.type === "event") {
                return (a.startTime || "").localeCompare(b.startTime || "");
              }
              
              // Tasks go after events
              if (a.type === "event" && b.type === "task") return -1;
              if (a.type === "task" && b.type === "event") return 1;
              
              return 0;
            });
            
            // Process each item
            for (const item of dayItems) {
              const paddedTitle = item.title.padEnd(maxTitleLength);
              const idPart = options.showIds ? ` [${item.id}]` : "";
              
              if (item.type === "event") {
                const timeDisplay = item.isAllDay 
                  ? "All-day  " 
                  : formatTime(new Date(item.startTime || "")) + "  ";
                  
                console.log(`${chalk.blue(timeDisplay)} ${paddedTitle}${idPart}`);
              } else {
                // For tasks, show checkbox
                console.log(`${chalk.green("[ ]     ")} ${paddedTitle}${idPart}`);
              }
            }
            
            console.log(); // Empty line between days
          }
          
        } catch (error) {
          console.error(
            chalk.red(
              `Error displaying agenda: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      }
    )
  );