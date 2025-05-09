import { Command } from "commander";
import { z } from "zod";
import chalk from "chalk";
import { an } from "../../lib/an";
import { getGoogleClients, listTasks, getTaskLists } from "../../integrations/google";
import { parseDate, formatDate } from "../../lib/date-time";

export const lsCommand = new Command("ls")
  .description("List tasks")
  .option("--list <name>", "Task list name/ID (defaults to @default)")
  .option("--all", "Show completed tasks")
  .option("--due <date>", "Show tasks due by this date")
  .option("--contains <text>", "Filter tasks containing this text")
  .option("--show-ids", "Show task IDs")
  .action(
    an(
      z.tuple([
        z.object({
          list: z.string().optional(),
          all: z.boolean().optional(),
          due: z.string().optional(),
          contains: z.string().optional(),
          showIds: z.boolean().optional(),
        }),
      ]),
      async (options) => {
        try {
          // Get Google Tasks client
          const { tasks } = await getGoogleClients();
          
          // Get task list ID
          let taskListId = "@default";
          let taskListName = "Default";
          
          if (options.list) {
            // If a list name is provided, try to find its ID
            const taskLists = await getTaskLists(tasks);
            const matchingList = taskLists.find(
              list => list.title?.toLowerCase() === options.list?.toLowerCase()
            );
            
            if (matchingList && matchingList.id) {
              taskListId = matchingList.id;
              taskListName = matchingList.title || "Default";
            } else {
              console.warn(
                chalk.yellow(`Task list "${options.list}" not found. Using default list.`)
              );
            }
          } else {
            // Get the name of the default task list
            const taskLists = await getTaskLists(tasks);
            const defaultList = taskLists.find(list => list.id === taskListId);
            if (defaultList && defaultList.title) {
              taskListName = defaultList.title;
            }
          }
          
          // Get tasks
          const taskItems = await listTasks(tasks, taskListId, options.all || false);
          
          // Filter tasks if needed
          let filteredTasks = [...taskItems];
          
          // Filter by due date if specified
          if (options.due) {
            const dueDate = parseDate(options.due);
            dueDate.setHours(23, 59, 59, 999);
            
            filteredTasks = filteredTasks.filter(task => {
              if (!task.due) return false;
              
              const taskDueDate = new Date(task.due);
              return taskDueDate <= dueDate;
            });
          }
          
          // Filter by text content if specified
          if (options.contains) {
            const searchText = options.contains.toLowerCase();
            
            filteredTasks = filteredTasks.filter(task => {
              const title = (task.title || "").toLowerCase();
              const notes = (task.notes || "").toLowerCase();
              
              return title.includes(searchText) || notes.includes(searchText);
            });
          }
          
          // Check if we have any tasks after filtering
          if (filteredTasks.length === 0) {
            console.log(chalk.yellow("No tasks found matching your criteria."));
            return;
          }
          
          // Display tasks
          console.log(chalk.bold(`Tasks in list: ${taskListName}`));
          
          // Group tasks by due date
          const tasksByDueDate: Record<string, any[]> = {
            "No due date": [],
          };
          
          for (const task of filteredTasks) {
            let dueDateKey = "No due date";
            
            if (task.due) {
              const dueDate = new Date(task.due);
              dueDateKey = formatDate(dueDate);
            }
            
            if (!tasksByDueDate[dueDateKey]) {
              tasksByDueDate[dueDateKey] = [];
            }
            
            tasksByDueDate[dueDateKey].push(task);
          }
          
          // Sort tasks by due date (chronologically)
          const sortedDates = Object.keys(tasksByDueDate).sort((a, b) => {
            if (a === "No due date") return 1;
            if (b === "No due date") return -1;
            return a.localeCompare(b);
          });
          
          // Display tasks grouped by due date
          for (const dueDateKey of sortedDates) {
            const tasksForDate = tasksByDueDate[dueDateKey];
            
            if (tasksForDate.length > 0) {
              console.log(chalk.blue(`\n${dueDateKey}:`));
              
              for (const task of tasksForDate) {
                const status = task.status === "completed" ? "✓" : "[ ]";
                const idPart = options.showIds ? ` [${task.id}]` : "";
                
                console.log(`  ${status} ${task.title}${idPart}`);
                
                // Show notes if present
                if (task.notes) {
                  const indentedNotes = task.notes
                    .split("\n")
                    .map((line: string) => `      ${line}`)
                    .join("\n");
                  
                  console.log(chalk.gray(indentedNotes));
                }
              }
            }
          }
          
        } catch (error) {
          console.error(
            chalk.red(
              `Error listing tasks: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      }
    )
  );