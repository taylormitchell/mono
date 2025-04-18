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
      if (opts.notify) {
        requestBody.reminders = {
          useDefault: false,
          overrides: [{ method: "popup", minutes: 0 }],
        };
      }

      await cal.events.insert({ calendarId, requestBody });
      console.log("✅  Quick event added.");
    });
  return cmd;
}
