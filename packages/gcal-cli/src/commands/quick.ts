import { Command } from "commander";
import { getClients } from "../google";
import { toRFC3339 } from "../time";
import { parseQuickAdd } from "../lib/quickAddParser";

/**
 * Quick-add command to create an event for a specified duration or until a time.
 */
export function quickCmd(): Command {
  const cmd = new Command("quick")
    .description("Quickly add an event for a duration or until a time")
    .argument("<text...>", 'natural‑language description, e.g. "Review PR til 4pm"')
    .option("-c, --cal <name>", "calendar name (default from config)")
    .option("--notify", "set a popup notification at end time")
    .action(async (text, opts) => {
      const input = text.join(" ");
      const { title: rawTitle, start, end } = parseQuickAdd(input);
      const title = rawTitle.startsWith("[ ] ") ? rawTitle : `[ ] ${rawTitle}`;

      const { cal } = await getClients();
      const calendarId = opts.cal || "primary";

      const requestBody: any = {
        summary: title,
        start: { dateTime: toRFC3339(start) },
        end: { dateTime: toRFC3339(end) },
      };

      await cal.events.insert({ calendarId, requestBody });
      console.log("✅  Quick event added.");

      // If notify flag is set, schedule a separate 'Times up!' event at end time
      if (opts.notify) {
        const reminderStart = end;
        const reminderEnd = new Date(end.getTime() + 15 * 60 * 1000);
        const reminderBody: any = {
          summary: "Times up!",
          start: { dateTime: toRFC3339(reminderStart) },
          end: { dateTime: toRFC3339(reminderEnd) },
        };
        await cal.events.insert({ calendarId, requestBody: reminderBody });
        console.log("✅  Reminder event 'Times up!' added.");
      }
    });
  return cmd;
}
