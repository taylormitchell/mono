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

export function agendaCmd(): Command {
  const cmd = new Command("agenda")
    .description("Show events & tasks in a date window")
    .addHelpText("after", "\n  Defaults: Work Intentions, Intentions")
    .option("--today", "agenda for today (default)")
    .option("--tomorrow", "agenda for tomorrow")
    .option("--after <dt>", "ISO or natural language start")
    .option("--before <dt>", "ISO or natural language end")
    .option(
      "--cal <names>",
      'Comma‑separated calendar names. Defaults to "Work Intentions,Intentions"'
    )
    .option("--account <name>", "Google account (default)")
    .option("--show-ids", "Show item IDs")
    .action(async (opts) => {
      // 1. Compute time window --------------------------------------------
      let timeMin: string | undefined;
      let timeMax: string | undefined;

      if (opts.after || opts.before) {
        const after = opts.after ? parseNatural(opts.after) : undefined;
        const before = opts.before ? parseNatural(opts.before) : undefined;

        if (after) timeMin = toRFC3339(after);
        if (before) timeMax = toRFC3339(before);

        // If user gave only one bound, default the other to ±24 h
        if (!timeMin && timeMax) {
          timeMin = toRFC3339(DateTime.fromISO(timeMax).minus({ days: 1 }).toJSDate());
        }
        if (!timeMax && timeMin) {
          timeMax = toRFC3339(DateTime.fromISO(timeMin).plus({ days: 1 }).toJSDate());
        }
      }

      // Default time window: upcoming events from now until end of today
      const now = new Date();
      if (opts.today) {
        timeMin = toRFC3339(now);
        timeMax = endOfDay(now);
      } else if (opts.tomorrow) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        timeMin = startOfDay(tomorrow);
        timeMax = endOfDay(tomorrow);
      } else if (!opts.after && !opts.before && (!timeMin || !timeMax)) {
        timeMin = toRFC3339(now);
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
      console.log(`${DateTime.fromISO(timeMin).toFormat("yyyy‑LL‑dd")}`);

      // Find the maximum length of event summaries to align IDs
      const maxLength = items.reduce((max, it) => {
        const text = it.type === "event" ? it.summary : it.title;
        return Math.max(max, text.length);
      }, 0);

      for (const it of items) {
        if (it.type === "event") {
          const paddedSummary = it.summary.padEnd(maxLength);
          const idPart = opts.showIds ? ` [${it.id}]` : "";
          console.log(`${fmt(it.start, it.allday)}  ${paddedSummary}${idPart}`);
        } else {
          // const paddedTitle = it.title.padEnd(maxLength);
          // const idPart = opts.showIds ? ` (${it.id})` : "";
          // console.log(`${fmt(it.due)}  · [ ] ${paddedTitle}${idPart}`);
        }
      }

      // if (untimedTasks.length) {
      //   console.log("\nTasks:");
      //   console.log("──────");
      //   for (const t of untimedTasks) {
      //     const due = DateTime.fromISO(t.due).toFormat("yyyy‑LL‑dd");
      //     console.log(`• [ ] ${t.title} (${t.id})  (due ${due})`);
      //   }
      // }
      console.log();
    });

  return cmd;
}
