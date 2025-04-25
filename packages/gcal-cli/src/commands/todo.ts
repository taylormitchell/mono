import { Command } from "commander";
import { DateTime } from "luxon";
import { getClients, listTasks } from "../google";
import { parseNatural, toRFC3339 } from "../time";

export function todoCmd(): Command {
  const cmd = new Command("todo")
    .description("Manage tasks and to-dos")
    .option("--today", "Show tasks due today")
    .option("--tomorrow", "Show tasks due tomorrow")
    .option("--this-week", "Show tasks due this week")
    .option("--next-week", "Show tasks due next week")
    .option("--all", "Show all incomplete tasks")
    .option("--overdue", "Show only overdue tasks")
    .option("--no-due-date", "Show only tasks without due dates")
    .option("--account <n>", "Google account (default)")
    .option("--show-ids", "Show task IDs")
    .action(async (opts) => {
      let timeMin: string | undefined;
      let timeMax: string | undefined;
      const now = new Date();
      const showOverdue = opts.overdue || false;
      const showNoDueDate = opts.noDueDate || false;
      const showAll = opts.all || false;
      
      if (!showAll && !showOverdue && !showNoDueDate) {
        // Set time filters if not showing all tasks
        if (opts.thisWeek) {
          const currentWeekStart = DateTime.fromJSDate(now).startOf('week');
          timeMin = showOverdue ? undefined : toRFC3339(currentWeekStart.toJSDate());
          timeMax = toRFC3339(currentWeekStart.plus({ days: 6 }).endOf('day').toJSDate());
        } else if (opts.nextWeek) {
          const nextWeekStart = DateTime.fromJSDate(now).startOf('week').plus({ weeks: 1 });
          timeMin = showOverdue ? undefined : toRFC3339(nextWeekStart.toJSDate());
          timeMax = toRFC3339(nextWeekStart.plus({ days: 6 }).endOf('day').toJSDate());
        } else if (opts.today) {
          timeMin = showOverdue ? undefined : toRFC3339(DateTime.fromJSDate(now).startOf('day').toJSDate());
          timeMax = toRFC3339(DateTime.fromJSDate(now).endOf('day').toJSDate());
        } else if (opts.tomorrow) {
          const tomorrow = DateTime.fromJSDate(now).plus({ days: 1 });
          timeMin = showOverdue ? undefined : toRFC3339(tomorrow.startOf('day').toJSDate());
          timeMax = toRFC3339(tomorrow.endOf('day').toJSDate());
        } else {
          // Default to showing tasks due from now onwards
          timeMin = showOverdue ? undefined : toRFC3339(now);
          timeMax = undefined;
        }
      }

      const { tasks } = await getClients(opts.account);
      
      // Fetch all tasks from default task list
      const taskItems = await listTasks(tasks, "@default", timeMax);
      
      // Filter tasks based on options
      let filteredTasks = taskItems.filter(task => !task.completed);
      
      if (showOverdue) {
        // Filter to only show overdue tasks
        filteredTasks = filteredTasks.filter(task => {
          if (!task.due) return false;
          return DateTime.fromISO(task.due) < DateTime.fromJSDate(now);
        });
      } else if (showNoDueDate) {
        // Filter to show only tasks without due dates
        filteredTasks = filteredTasks.filter(task => !task.due);
      } else if (!showAll) {
        // Apply time range filtering for non-overdue tasks
        if (timeMin) {
          filteredTasks = filteredTasks.filter(task => {
            if (!task.due) return showNoDueDate;
            return DateTime.fromISO(task.due) >= DateTime.fromISO(timeMin!);
          });
        }
        
        if (timeMax) {
          filteredTasks = filteredTasks.filter(task => {
            if (!task.due) return showNoDueDate;
            return DateTime.fromISO(task.due) <= DateTime.fromISO(timeMax!);
          });
        }
      }
      
      // Group tasks by due date
      const tasksByDate: Record<string, any[]> = {};
      const tasksWithoutDueDate: any[] = [];
      
      for (const task of filteredTasks) {
        if (!task.due) {
          tasksWithoutDueDate.push(task);
          continue;
        }
        
        const dueDate = task.due.includes('T') 
          ? DateTime.fromISO(task.due).toFormat('yyyy-MM-dd')
          : task.due.split('T')[0];
        
        if (!tasksByDate[dueDate]) {
          tasksByDate[dueDate] = [];
        }
        
        tasksByDate[dueDate].push(task);
      }
      
      // Display tasks grouped by date
      console.log();
      
      if (Object.keys(tasksByDate).length > 0) {
        for (const date of Object.keys(tasksByDate).sort()) {
          const formattedDate = DateTime.fromISO(date).toFormat("EEE, MMM d, yyyy");
          console.log(formattedDate);
          console.log("─".repeat(formattedDate.length));
          
          const dateTasksSorted = tasksByDate[date].sort((a, b) => {
            // Check for UTC midnight tasks (all-day tasks with time component)
            const aIsAllDayUtc = a.due.endsWith('T00:00:00Z') || a.due.endsWith('T00:00:00.000Z');
            const bIsAllDayUtc = b.due.endsWith('T00:00:00Z') || b.due.endsWith('T00:00:00.000Z');
            
            const aIsAllDay = !a.due.includes('T') || aIsAllDayUtc;
            const bIsAllDay = !b.due.includes('T') || bIsAllDayUtc;
            
            // Sort all-day tasks to the bottom
            if (aIsAllDay && !bIsAllDay) return 1;
            if (!aIsAllDay && bIsAllDay) return -1;
            
            // Both are all-day or both are timed, so sort by due time
            return a.due.localeCompare(b.due);
          });
          
          for (const task of dateTasksSorted) {
            // Check if task is an all-day UTC midnight task
            const isAllDayUtc = task.due.endsWith('T00:00:00Z') || task.due.endsWith('T00:00:00.000Z');
            const isAllDay = !task.due.includes('T') || isAllDayUtc;
            
            const time = isAllDay ? "All-day" : DateTime.fromISO(task.due).toFormat("HH:mm");
            
            const idPart = opts.showIds ? ` [${task.id}]` : "";
            const statusIcon = task.status === 'needsAction' ? '□' : '✓';
            
            console.log(`${time}  ${statusIcon} ${task.title}${idPart}`);
          }
          
          console.log();
        }
      }
      
      // Display tasks without due dates
      if (tasksWithoutDueDate.length > 0) {
        console.log("Tasks Without Due Date");
        console.log("─".repeat(21));
        
        for (const task of tasksWithoutDueDate) {
          const idPart = opts.showIds ? ` [${task.id}]` : "";
          const statusIcon = task.status === 'needsAction' ? '□' : '✓';
          
          console.log(`${statusIcon} ${task.title}${idPart}`);
        }
        
        console.log();
      }
      
      if (filteredTasks.length === 0) {
        console.log("No matching tasks found.");
        console.log();
      }
    });

  return cmd;
}