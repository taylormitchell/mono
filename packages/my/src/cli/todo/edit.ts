import { Command } from "commander";
import { z } from "zod";
import chalk from "chalk";
import { an } from "../../lib/an";
import { getGoogleClients, updateTask, listTasks, getTaskLists } from "../../integrations/google";
import { parseDate } from "../../lib/date-time";

export const editCommand = new Command("edit")
  .description("Edit a task")
  .argument("<id_or_text>", "Task ID or part of the task text to match")
  .option("--title <text>", "New task title")
  .option("--notes <text>", "New notes for the task")
  .option("--due <date>", "New due date (can use natural language like 'tomorrow')")
  .option("--clear-due", "Clear the due date")
  .option("--list <name>", "Task list name/ID (defaults to @default)")
  .action(
    an(
      z.tuple([
        z.string(),
        z.object({
          title: z.string().optional(),
          notes: z.string().optional(),
          due: z.string().optional(),
          clearDue: z.boolean().optional(),
          list: z.string().optional(),
        }),
      ]),
      async (idOrText, options) => {
        try {
          // Check if any fields to update are provided
          if (!options.title && !options.notes && !options.due && !options.clearDue) {
            console.error(chalk.red("Error: At least one field to update must be specified."));
            console.log("Available fields: --title, --notes, --due, --clear-due");
            process.exit(1);
          }
          
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
          
          // First, get all tasks to find the right one if using text match
          const allTasks = await listTasks(tasks, taskListId, true);
          
          // Try to find task by ID first
          let taskToUpdate = allTasks.find(task => task.id === idOrText);
          
          // If no match by ID, try to find by title text match
          if (!taskToUpdate) {
            const searchText = idOrText.toLowerCase();
            
            taskToUpdate = allTasks.find(task => 
              (task.title || "").toLowerCase().includes(searchText)
            );
          }
          
          // If we still don't have a match, show error
          if (!taskToUpdate) {
            console.error(chalk.red(`No matching task found for "${idOrText}".`));
            process.exit(1);
          }
          
          // Prepare update object with the found task as the base
          // This is important to preserve other fields
          const updateObj = { ...taskToUpdate };
          
          // Apply updates
          if (options.title) {
            updateObj.title = options.title;
          }
          
          if (options.notes) {
            updateObj.notes = options.notes;
          }
          
          if (options.due) {
            const dueDate = parseDate(options.due);
            
            // Set the time to end of day (23:59:59)
            dueDate.setHours(23, 59, 59, 999);
            
            // Format for Google Tasks API (RFC 3339 timestamp)
            updateObj.due = dueDate.toISOString();
          } else if (options.clearDue) {
            // Remove the due date
            delete updateObj.due;
          }
          
          // Update the task
          const updatedTask = await updateTask(
            tasks,
            taskToUpdate.id || "",
            updateObj,
            taskListId
          );
          
          console.log(chalk.green("✓ Task updated:"), updatedTask.title);
          
        } catch (error) {
          console.error(
            chalk.red(
              `Error updating task: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      }
    )
  );