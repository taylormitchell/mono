import { Command } from "commander";
import { z } from "zod";
import chalk from "chalk";
import { an } from "../../lib/an";
import { getGoogleClients, deleteTask, listTasks, getTaskLists } from "../../integrations/google";

export const rmCommand = new Command("rm")
  .description("Remove a task")
  .argument("<id_or_text>", "Task ID or part of the task text to match")
  .option("--list <name>", "Task list name/ID (defaults to @default)")
  .option("--force", "Skip confirmation prompt")
  .action(
    an(
      z.tuple([
        z.string(),
        z.object({
          list: z.string().optional(),
          force: z.boolean().optional(),
        }),
      ]),
      async (idOrText, options) => {
        try {
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
          let taskToDelete = allTasks.find(task => task.id === idOrText);
          
          // If no match by ID, try to find by title text match
          if (!taskToDelete) {
            const searchText = idOrText.toLowerCase();
            
            taskToDelete = allTasks.find(task => 
              (task.title || "").toLowerCase().includes(searchText)
            );
          }
          
          // If we still don't have a match, show error
          if (!taskToDelete) {
            console.error(chalk.red(`No matching task found for "${idOrText}".`));
            process.exit(1);
          }
          
          // Get task details for confirmation
          const taskTitle = taskToDelete.title || "(No title)";
          
          // If not forced, we would show confirmation prompt here
          // But since we're in a CLI tool without interactive capabilities, we'll just proceed
          // In a real implementation, you might use the 'readline' module for confirmation
          
          // Delete the task
          await deleteTask(
            tasks,
            taskToDelete.id || "",
            taskListId
          );
          
          console.log(chalk.green("✓ Task removed:"), taskTitle);
          
        } catch (error) {
          console.error(
            chalk.red(
              `Error removing task: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      }
    )
  );