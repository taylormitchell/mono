import { Command } from "commander";
import { DateTime } from "luxon";
import { getClients, listEvents, listTasks } from "../google";
import { parseNatural, toRFC3339 } from "../time";

/**
 * Build an ISO string for the start of the local day.
 */
function startOfDay(d: Date): string {
  const res = DateTime.fromJSDate(d).startOf("day").toISO();
  if (!res) throw new Error("Could not get start of day");
  return res;
}

/**
 * Build an ISO string for the end of the local day (23:59:59.999).
 */
function endOfDay(d: Date): string {
  const res = DateTime.fromJSDate(d).endOf("day").toISO();
  if (!res) throw new Error("Could not get end of day");
  return res;
}

/**
 * Pretty‑print a date‑time (HH:mm) or "All‑day".
 */
function fmt(dt?: string, allday = false): string {
  if (allday || !dt) return "All‑day ";
  return DateTime.fromISO(dt).toFormat("HH:mm");
}

/**
 * Format a date for display with weekday
 */
function formatDateHeader(date: string): string {
  return DateTime.fromISO(date).toFormat("EEE, MMM d, yyyy");
}

export function agendaCmd(): Command {
  const cmd = new Command("agenda")
    .description("Show events & tasks in a date window")
    .addHelpText("after", "\n  Defaults: Work Intentions, Intentions")
    .option("--today", "agenda for today (default)")
    .option("--tomorrow", "agenda for tomorrow")
    .option("--this-week", "agenda for current week (Monday-Sunday)")
    .option("--next-week", "agenda for next week (Monday-Sunday)")
    .option("--after <dt>", "ISO or natural language start")
    .option("--before <dt>", "ISO or natural language end")
    .option(
      "--cal <names>",
      'Comma‑separated calendar names. Defaults to "Work Intentions,Intentions"'
    )
    .option("--account <n>", "Google account (default)")
    .option("--show-ids", "Show item IDs")
    .action(async (opts) => {
      // 1. Compute time window --------------------------------------------
      let timeMin: string | undefined;
      let timeMax: string | undefined;
      const now = new Date();
      
      if (opts.thisWeek) {
        // Find the Monday of current week
        const currentWeekStart = DateTime.fromJSDate(now).startOf('week');
        timeMin = toRFC3339(currentWeekStart.toJSDate());
        timeMax = toRFC3339(currentWeekStart.plus({ days: 6 }).endOf('day').toJSDate());
      } else if (opts.nextWeek) {
        // Find the Monday of next week
        const nextWeekStart = DateTime.fromJSDate(now).startOf('week').plus({ weeks: 1 });
        timeMin = toRFC3339(nextWeekStart.toJSDate());
        timeMax = toRFC3339(nextWeekStart.plus({ days: 6 }).endOf('day').toJSDate());
      } else if (opts.after || opts.before) {
        // When --before is specified without --after, default --after to now
        const after = opts.after ? parseNatural(opts.after) : (opts.before ? now : undefined);
        const before = opts.before ? parseNatural(opts.before) : undefined;

        if (after) timeMin = toRFC3339(after);
        if (before) timeMax = toRFC3339(before);

        // If user gave only one bound, default the other appropriately
        if (!timeMin && timeMax) {
          timeMin = toRFC3339(now);
        }
        if (!timeMax && timeMin) {
          timeMax = toRFC3339(DateTime.fromISO(timeMin).plus({ days: 1 }).toJSDate());
        }
      } else if (opts.today) {
        timeMin = startOfDay(now);
        timeMax = endOfDay(now);
      } else if (opts.tomorrow) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        timeMin = startOfDay(tomorrow);
        timeMax = endOfDay(tomorrow);
      } else if (!timeMin || !timeMax) {
        // Default is today's agenda
        timeMin = startOfDay(now);
        timeMax = endOfDay(now);
      }

      // 2. Fetch data ------------------------------------------------------
      const { cal, tasks } = await getClients(opts.account);
      // Determine which calendars to pull from. Include primary by default.
      const defaultCalNames = ["Work Intentions", "Intentions"];
      const listCal = await cal.calendarList.list();
      const calMap: Record<string, string> = {};
      for (const c of listCal.data.items ?? []) {
        if (c.summary) calMap[c.summary.toLowerCase()] = c.id!;
      }
      let calIds: string[];
      if (opts.cal) {
        const names = opts.cal.split(",").map((s: string) => s.trim());
        calIds = names.map((name) => {
          if (name.toLowerCase() === "primary") return "primary";
          const id = calMap[name.toLowerCase()];
          if (!id) throw new Error(`Calendar "${name}" not found`);
          return id;
        });
      } else {
        calIds = ["primary"];
        for (const name of defaultCalNames) {
          const id = calMap[name.toLowerCase()];
          if (!id) throw new Error(`Calendar "${name}" not found`);
          calIds.push(id);
        }
      }

      // Pull events from each calendar
      const evtsArr = await Promise.all(
        calIds.map((cid) => listEvents(cal, cid, timeMin!, timeMax!))
      );
      // Filter out birthday events (e.g., Contacts birthdays)
      const evts = evtsArr
        .flat()
        .filter(e => !(e.summary || "").toLowerCase().includes("birthday"));
      const tlist = await listTasks(tasks, "@default", timeMax);

      // 3. Split tasks: timed vs. untimed ----------------------------------
      const timedTasks: any[] = [];
      const untimedTasks: any[] = [];
      for (const t of tlist) {
        if (!t.due) continue;
        // Google uses full‑day tasks with "YYYY‑MM‑DD" (no 'T')
        if (t.due.includes("T")) timedTasks.push(t);
        else untimedTasks.push(t);
      }

      // 4. Merge events + timed tasks -------------------------------------
      type Item =
        | { type: "event"; id: string; summary: string; start: string; allday: boolean }
        | { type: "task"; id: string; title: string; due: string };

      const items: Item[] = [];

      for (const e of evts) {
        const allday = !!e.start?.date && !e.start.dateTime;
        items.push({
          type: "event",
          id: e.id!,
          summary: e.summary ?? "(no title)",
          start: e.start?.dateTime ?? e.start?.date!, // fall back to all‑day date
          allday,
        });
      }

      for (const t of timedTasks) {
        items.push({
          type: "task",
          id: t.id!,
          title: t.title ?? "(untitled task)",
          due: t.due!,
        });
      }

      // Sort by start/due time
      items.sort((a, b) => {
        const ta = a.type === "event" ? a.start : a.due;
        const tb = b.type === "event" ? b.start : b.due;
        return ta.localeCompare(tb);
      });

      // 5. Render ----------------------------------------------------------
      console.log();
      
      // Group items by day
      const itemsByDay: Record<string, Item[]> = {};
      
      for (const item of items) {
        const date = item.type === "event" 
          ? DateTime.fromISO(item.start).startOf('day').toISO()
          : DateTime.fromISO(item.due).startOf('day').toISO();
        
        if (!date) continue;
        
        if (!itemsByDay[date]) {
          itemsByDay[date] = [];
        }
        
        itemsByDay[date].push(item);
      }
      
      // Find the maximum length of event summaries to align IDs
      const maxLength = items.reduce((max, it) => {
        const text = it.type === "event" ? it.summary : it.title;
        return Math.max(max, text.length);
      }, 0);

      // Display items grouped by day
      for (const date of Object.keys(itemsByDay).sort()) {
        // Print date header
        console.log(formatDateHeader(date));
        console.log("─".repeat(formatDateHeader(date).length));
        
        for (const it of itemsByDay[date]) {
          if (it.type === "event") {
            const paddedSummary = it.summary.padEnd(maxLength);
            const idPart = opts.showIds ? ` [${it.id}]` : "";
            console.log(`${fmt(it.start, it.allday)}  ${paddedSummary}${idPart}`);
          } else {
            const paddedTitle = it.title.padEnd(maxLength);
            const idPart = opts.showIds ? ` [${it.id}]` : "";
            console.log(`${fmt(it.due)}  · [ ] ${paddedTitle}${idPart}`);
          }
        }
        
        console.log(); // Add space between days
      }

      // Display untimed tasks at the end
      if (untimedTasks.length) {
        console.log("Untimed Tasks");
        console.log("─".repeat(12));
        
        for (const t of untimedTasks) {
          const due = DateTime.fromISO(t.due).toFormat("yyyy‑LL‑dd");
          const idPart = opts.showIds ? ` [${t.id}]` : "";
          console.log(`• [ ] ${t.title}${idPart}  (due ${due})`);
        }
        console.log();
      }
    });

  return cmd;
}