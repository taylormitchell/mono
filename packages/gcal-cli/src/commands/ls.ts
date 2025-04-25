import { Command } from "commander";
import { DateTime } from "luxon";
import { getClients, listEvents, listTasks } from "../google";
import { parseNatural, toRFC3339 } from "../time";

function startOfDay(d: Date): string {
  const res = DateTime.fromJSDate(d).startOf("day").toISO();
  if (!res) throw new Error("Could not get start of day");
  return res;
}

function endOfDay(d: Date): string {
  const res = DateTime.fromJSDate(d).endOf("day").toISO();
  if (!res) throw new Error("Could not get end of day");
  return res;
}

function fmt(dt?: string, allday = false): string {
  if (allday || !dt) return "All-day";
  return DateTime.fromISO(dt).toFormat("HH:mm");
}

export function lsCmd(): Command {
  const cmd = new Command("ls")
    .description("List events & tasks with filters")
    .option("--today", "today's items")
    .option("--tomorrow", "tomorrow's items")
    .option("--this-week", "current week's items (Monday-Sunday)")
    .option("--next-week", "next week's items (Monday-Sunday)")
    .option("--after <dt>", "ISO or natural language start")
    .option("--before <dt>", "ISO or natural language end")
    .option(
      "--cal <names>",
      'Comma‑separated calendar names. Defaults to "Work Intentions,Intentions"'
    )
    .option("--account <name>", "Google account (default)")
    .option("--contains <str>", "Filter items containing substring")
    .option("--show-ids", "Show item IDs")
    .action(async (opts) => {
      let timeMin: string | undefined;
      let timeMax: string | undefined;
      const now = new Date();

      if (opts.thisWeek) {
        // Find the Monday of current week
        const currentWeekStart = DateTime.fromJSDate(now).startOf("week");
        timeMin = toRFC3339(currentWeekStart.toJSDate());
        timeMax = toRFC3339(currentWeekStart.plus({ days: 6 }).endOf("day").toJSDate());
      } else if (opts.nextWeek) {
        // Find the Monday of next week
        const nextWeekStart = DateTime.fromJSDate(now).startOf("week").plus({ weeks: 1 });
        timeMin = toRFC3339(nextWeekStart.toJSDate());
        timeMax = toRFC3339(nextWeekStart.plus({ days: 6 }).endOf("day").toJSDate());
      } else if (opts.after || opts.before) {
        // When --before is specified without --after, default --after to now
        const after = opts.after ? parseNatural(opts.after) : opts.before ? now : undefined;
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
        const t = new Date(now);
        t.setDate(t.getDate() + 1);
        timeMin = startOfDay(t);
        timeMax = endOfDay(t);
      } else if (!timeMin || !timeMax) {
        // Default is today's agenda
        timeMin = startOfDay(now);
        timeMax = endOfDay(now);
      }

      const { cal, tasks } = await getClients(opts.account);
      // Determine which calendars to pull from. Include primary by default.
      const defaultCalNames = ["Work Intentions", "Intentions"];
      const list = await cal.calendarList.list();
      const calMap: Record<string, string> = {};
      for (const c of list.data.items ?? []) {
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
        // default: include primary plus configured names
        calIds = ["primary"];
        for (const name of defaultCalNames) {
          const id = calMap[name.toLowerCase()];
          if (!id) throw new Error(`Calendar "${name}" not found`);
          calIds.push(id);
        }
      }

      const evtsArr = await Promise.all(
        calIds.map((cid) => listEvents(cal, cid, timeMin!, timeMax!))
      );
      // Filter out birthday events
      const events = evtsArr
        .flat()
        .filter((e) => !(e.summary || "").toLowerCase().includes("birthday"));
      const tlist = await listTasks(tasks, "@default", timeMax!);
      const tasksFiltered = tlist
        .filter((t) => !!t.due)
        .map((t) => ({ ...t, dueDate: t.due!.split("T")[0] }))
        .filter((t) => {
          const dueDate = DateTime.fromISO(t.dueDate);
          return (
            toRFC3339(dueDate.toJSDate()) >= timeMin! && toRFC3339(dueDate.toJSDate()) <= timeMax!
          );
        });

      // Filter by contains if needed
      const cont = opts.contains ? opts.contains.toLowerCase() : null;

      // Process events
      let filteredEvents = events.map((e) => {
        const allday = !!e.start?.date && !e.start.dateTime;
        const start = e.start?.dateTime ?? e.start?.date!;
        return {
          id: e.id!,
          summary: e.summary || "(no title)",
          start,
          allday,
        };
      });

      // Filter events if contains is specified
      if (cont) {
        filteredEvents = filteredEvents.filter((e) => e.summary.toLowerCase().includes(cont));
      }

      // Sort events by date/time
      filteredEvents.sort((a, b) => {
        return a.start.localeCompare(b.start);
      });

      // Process tasks
      let filteredTasks = tasksFiltered;

      // Filter tasks if contains is specified
      if (cont) {
        filteredTasks = filteredTasks.filter((t) => (t.title || "").toLowerCase().includes(cont));
      }

      console.log();

      // Display events first
      for (const e of filteredEvents) {
        const time = fmt(e.start, e.allday);
        const idPart = opts.showIds ? ` (${e.id})` : "";
        console.log(`${time}  ${e.summary}${idPart}`);
      }

      // Display tasks second (always after events)
      for (const t of filteredTasks) {
        const time = fmt(t.due!, false);
        const idPart = opts.showIds ? ` (${t.id})` : "";
        console.log(`${time}  · [ ] ${t.title || "(untitled task)"}${idPart}`);
      }

      console.log();
    });
  return cmd;
}
