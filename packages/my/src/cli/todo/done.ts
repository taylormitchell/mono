import { Command } from "commander";
import { z } from "zod";
import chalk from "chalk";
import { an } from "../../lib/an";
import { getGoogleClients, updateTask, listTasks, getTaskLists } from "../../integrations/google";

export const doneCommand = new Command("done")
  .description("Mark a task as completed")
  .argument("<id_or_text>", "Task ID or part of the task text to match")
  .option("--list <name>", "Task list name/ID (defaults to @default)")
  .action(
    an(
      z.tuple([
        z.string(),
        z.object({
          list: z.string().optional(),
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
          let taskToUpdate = allTasks.find(task => task.id === idOrText);
          
          // If no match by ID, try to find by title text match
          if (!taskToUpdate) {
            const searchText = idOrText.toLowerCase();
            
            taskToUpdate = allTasks.find(task => 
              !task.completed && (task.title || "").toLowerCase().includes(searchText)
            );
          }
          
          // If we still don't have a match, show error
          if (!taskToUpdate) {
            console.error(chalk.red(`No matching incomplete task found for "${idOrText}".`));
            process.exit(1);
          }
          
          // Check if task is already completed
          if (taskToUpdate.status === "completed") {
            console.log(chalk.yellow(`Task "${taskToUpdate.title}" is already completed.`));
            return;
          }
          
          // Mark task as completed
          const updatedTask = await updateTask(
            tasks,
            taskToUpdate.id || "",
            {
              status: "completed",
              completed: new Date().toISOString(),
              ...taskToUpdate
            },
            taskListId
          );
          
          console.log(chalk.green("✓ Task completed:"), updatedTask.title);
          
        } catch (error) {
          console.error(
            chalk.red(
              `Error completing task: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      }
    )
  );