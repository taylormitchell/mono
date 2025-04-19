import { Command } from "commander";
import { DateTime } from "luxon";
import { getClients, listEvents, listTasks } from "../google";

export function nextCmd(): Command {
  const cmd = new Command("next")
    .description("Show the next event or timed task after now")
    .option(
      "--cal <names>",
      'Comma‑separated calendar names. Defaults to "Work Intentions,Intentions"'
    )
    .option("--account <name>", "Google account (default)")
    .option("--show-ids", "Show item IDs")
    .action(async (opts) => {
      const { cal, tasks } = await getClients(opts.account);

      const defaultCalNames = ["Work Intentions", "Intentions"];
      const calNames: string[] = opts.cal
        ? opts.cal.split(",").map((s: string) => s.trim())
        : defaultCalNames;

      const list = await cal.calendarList.list();
      const calMap: Record<string, string> = {};
      for (const c of list.data.items ?? []) {
        if (c.summary) calMap[c.summary.toLowerCase()] = c.id!;
      }
      const calIds: string[] = [];
      for (const name of calNames) {
        const id = calMap[name.toLowerCase()];
        if (!id) throw new Error(`Calendar "${name}" not found`);
        calIds.push(id);
      }

      const now = DateTime.local();
      const timeMin = now.toISO()!;
      const timeMax = now.plus({ days: 7 }).toISO()!;

      const evtsArr = await Promise.all(
        calIds.map((cid) => listEvents(cal, cid, timeMin, timeMax))
      );
      // Filter out birthday events
      const events = evtsArr
        .flat()
        .filter(e => !(e.summary || "").toLowerCase().includes("birthday"));
      const futureEvents = events.filter((e) => {
        const startISO = e.start?.dateTime ?? e.start?.date;
        if (!startISO) return false;
        return DateTime.fromISO(startISO) > now;
      });

      const tlist = await listTasks(tasks, "@default", timeMax);
      const timedTasks = tlist.filter((t) => t.due && t.due.includes("T"));
      const futureTasks = timedTasks.filter((t) => {
        return DateTime.fromISO(t.due!).toJSDate() > now.toJSDate();
      });

      const nextEvent = futureEvents
        .sort((a, b) => {
          const aStart = a.start?.dateTime ?? a.start?.date!;
          const bStart = b.start?.dateTime ?? b.start?.date!;
          return aStart.localeCompare(bStart);
        })[0];

      const nextTask = futureTasks
        .sort((a, b) => (a.due! as string).localeCompare(b.due! as string))[0];

      let pickType: "event" | "task" | null = null;
      if (nextEvent && nextTask) {
        const eStart = DateTime.fromISO(
          nextEvent.start?.dateTime ?? nextEvent.start?.date!
        );
        const tDue = DateTime.fromISO(nextTask.due!);
        pickType = eStart <= tDue ? "event" : "task";
      } else if (nextEvent) {
        pickType = "event";
      } else if (nextTask) {
        pickType = "task";
      }

      console.log();
      if (pickType === "event") {
        const e = nextEvent!;
        const startISO = e.start?.dateTime ?? e.start?.date!;
        const endISO = e.end?.dateTime ?? e.end?.date!;
        const start = DateTime.fromISO(startISO).toFormat("HH:mm");
        const end = DateTime.fromISO(endISO).toFormat("HH:mm");
        const idPart = opts.showIds && e.id ? ` (${e.id})` : "";
        console.log(`${start}-${end}  ${e.summary ?? "(no title)"}${idPart}`);
      } else if (pickType === "task") {
        const t = nextTask!;
        const due = DateTime.fromISO(t.due!).toFormat("HH:mm");
        const idPart = opts.showIds && t.id ? ` (${t.id})` : "";
        console.log(`${due}  · [ ] ${t.title ?? "(untitled task)"}${idPart}`);
      } else {
        console.log("No upcoming events or timed tasks found.");
      }
      console.log();
    });
  return cmd;
}
