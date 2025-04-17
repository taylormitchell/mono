import { Command } from "commander";
import { DateTime } from "luxon";
import { getClients, listEvents } from "../google";

/**
 * Return ISO string for now ± delta minutes.
 */
function isoDelta(minutes: number): string {
  return DateTime.local().plus({ minutes }).toISO();
}

export function nowCmd(): Command {
  const cmd = new Command("now")
    .description("Show the event/intention you are in right now")
    .option(
      "--cal <names>",
      'Comma‑separated calendar names. Defaults to "Work Intentions,Intentions"'
    )
    .option("--account <name>", "Google account (default)")
    .action(async (opts) => {
      const { cal } = await getClients(opts.account);

      // Which calendars to search?
      const defaultCalNames = ["Work Intentions", "Intentions"];
      const calNames: string[] = opts.cal
        ? opts.cal.split(",").map((s: string) => s.trim())
        : defaultCalNames;

      // Map calendar names → IDs
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

      // Query a 24‑hour window centred on now (to catch long events)
      const timeMin = isoDelta(-720); // 12 h ago
      const timeMax = isoDelta(720); // 12 h ahead

      // Gather events from each calendar
      const evtsArr = await Promise.all(
        calIds.map((cid) => listEvents(cal, cid, timeMin, timeMax))
      );
      const events = evtsArr.flat();

      const now = DateTime.local();

      // Find the first event whose span contains "now"
      const current = events.find((e) => {
        const startISO = e.start?.dateTime ?? e.start?.date;
        const endISO = e.end?.dateTime ?? e.end?.date;
        if (!startISO || !endISO) return false;
        const start = DateTime.fromISO(startISO);
        const end = DateTime.fromISO(endISO);
        return now >= start && now < end;
      });

      console.log();

      if (current) {
        const startISO = current.start?.dateTime ?? current.start?.date!;
        const endISO = current.end?.dateTime ?? current.end?.date!;
        const start = DateTime.fromISO(startISO).toFormat("HH:mm");
        const end = DateTime.fromISO(endISO).toFormat("HH:mm");
        console.log(`${start}‑${end}  ${current.summary ?? "(no title)"}`);
      } else {
        console.log("No event or intention scheduled right now.");
      }
      console.log();
    });

  return cmd;
}
