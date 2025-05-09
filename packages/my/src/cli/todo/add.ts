import { Command } from "commander";
import { z } from "zod";
import chalk from "chalk";
import { an } from "../../lib/an";
import { getGoogleClients, createTask, getTaskLists } from "../../integrations/google";
import { parseDate, formatDate } from "../../lib/date-time";

export const addCommand = new Command("add")
  .description("Add a new task")
  .argument("<text...>", "Task description")
  .option("--due <date>", "Due date (can use natural language like 'tomorrow')")
  .option("--list <name>", "Task list name/ID (defaults to @default)")
  .option("--notes <text>", "Additional notes for the task")
  .action(
    an(
      z.tuple([
        z.array(z.string()).min(1),
        z.object({
          due: z.string().optional(),
          list: z.string().optional(),
          notes: z.string().optional(),
        }),
      ]),
      async (textArray, options) => {
        try {
          // Join the text array to form the task title
          const title = textArray.join(" ");
          
          // Get Google Tasks client
          const { tasks } = await getGoogleClients();
          
          // Get task list ID
          let taskListId = "@default";
          
          if (options.list) {
            // If a list name is provided, try to find its ID
            const taskLists = await getTaskLists(tasks);
            const matchingList = taskLists.find(
              list => list.title?.toLowerCase() === options.list?.toLowerCase()
            );
            
            if (matchingList && matchingList.id) {
              taskListId = matchingList.id;
            } else {
              console.warn(
                chalk.yellow(`Task list "${options.list}" not found. Using default list.`)
              );
            }
          }
          
          // Prepare task object
          const task: any = {
            title,
            status: "needsAction",
          };
          
          // Handle due date if provided
          if (options.due) {
            const dueDate = parseDate(options.due);
            
            // Set the time to end of day (23:59:59)
            dueDate.setHours(23, 59, 59, 999);
            
            // Format for Google Tasks API (RFC 3339 timestamp)
            task.due = dueDate.toISOString();
          }
          
          // Add notes if provided
          if (options.notes) {
            task.notes = options.notes;
          }
          
          // Create the task
          const createdTask = await createTask(tasks, task, taskListId);
          
          // Display success message with due date if applicable
          const dueInfo = createdTask.due
            ? ` (due: ${formatDate(new Date(createdTask.due))})`
            : "";
            
          console.log(chalk.green("✓ Task added:"), createdTask.title + dueInfo);
          
        } catch (error) {
          console.error(
            chalk.red(
              `Error adding task: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      }
    )
  );