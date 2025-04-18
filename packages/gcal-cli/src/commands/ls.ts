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
    .option("--after <dt>", "ISO or natural language start")
    .option("--before <dt>", "ISO or natural language end")
    .option(
      "--cal <names>",
      'Comma‑separated calendar names. Defaults to "Work Intentions,Intentions"'
    )
    .option("--account <name>", "Google account (default)")
    .option("--contains <str>", "Filter items containing substring")
    .action(async (opts) => {
      let timeMin: string | undefined;
      let timeMax: string | undefined;

      if (opts.after || opts.before) {
        const after = opts.after ? parseNatural(opts.after) : undefined;
        const before = opts.before ? parseNatural(opts.before) : undefined;
        if (after) timeMin = toRFC3339(after);
        if (before) timeMax = toRFC3339(before);
        if (!timeMin && timeMax) {
          timeMin = toRFC3339(
            DateTime.fromISO(timeMax).minus({ days: 1 }).toJSDate()
          );
        }
        if (!timeMax && timeMin) {
          timeMax = toRFC3339(
            DateTime.fromISO(timeMin).plus({ days: 1 }).toJSDate()
          );
        }
      }

      // Default time window: upcoming events from now until end of today
      const now = new Date();
      if (opts.today) {
        timeMin = toRFC3339(now);
        timeMax = endOfDay(now);
      } else if (opts.tomorrow) {
        const t = new Date(now);
        t.setDate(t.getDate() + 1);
        timeMin = startOfDay(t);
        timeMax = endOfDay(t);
      } else if (!opts.after && !opts.before && (!timeMin || !timeMax)) {
        timeMin = toRFC3339(now);
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
      const events = evtsArr.flat();
      const tlist = await listTasks(tasks, "@default", timeMax!);
      const tasksFiltered = tlist.filter((t) => {
        if (!t.due) return false;
        const dueDate = DateTime.fromISO(t.due);
        return (
          toRFC3339(dueDate.toJSDate()) >= timeMin! &&
          toRFC3339(dueDate.toJSDate()) <= timeMax!
        );
      });

      type Item =
        | {
            id: string;
            type: "event";
            summary: string;
            start: string;
            allday: boolean;
          }
        | {
            id: string;
            type: "task";
            title: string;
            due: string;
            timed: boolean;
          };
      const items: Item[] = [];
      for (const e of events) {
        const allday = !!e.start?.date && !e.start.dateTime;
        const start = e.start?.dateTime ?? e.start?.date!;
        items.push({
          id: e.id!,
          type: "event",
          summary: e.summary || "(no title)",
          start,
          allday,
        });
      }
      for (const t of tasksFiltered) {
        const timed = t.due.includes("T");
        items.push({
          id: t.id!,
          type: "task",
          title: t.title || "(untitled task)",
          due: t.due!,
          timed,
        });
      }
      items.sort((a, b) => {
        const ta = a.type === "event" ? a.start : a.due;
        const tb = b.type === "event" ? b.start : b.due;
        return ta.localeCompare(tb);
      });

      const cont = opts.contains ? opts.contains.toLowerCase() : null;
      const finalItems = cont
        ? items.filter((it) => {
            const text = it.type === "event" ? it.summary : it.title;
            return text.toLowerCase().includes(cont);
          })
        : items;

      console.log();
      for (const it of finalItems) {
        if (it.type === "event") {
          const time = fmt(it.start, it.allday);
          console.log(`${time}  ${it.summary} (${it.id})`);
        } else {
          const time = fmt(it.due, !it.timed);
          console.log(`${time}  · [ ] ${it.title} (${it.id})`);
        }
      }
      console.log();
    });
  return cmd;
}
