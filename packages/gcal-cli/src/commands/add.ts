import { Command } from "commander";
import { getClients } from "../google";
import { parseNatural, defaultEnd, toRFC3339 } from "../time";

export function addCmd(): Command {
  const cmd = new Command("add")
    .argument("<text...>", 'natural‑language description, e.g. "Meet Bob 15:30"')
    .option("-i, --intention", "prefix title with [ ]")
    .option("-c, --cal <name>", "calendar name (default from config)")
    .action(async (text, opts) => {
      const input = text.join(" ");
      const start = parseNatural(input);
      if (!start) throw new Error("Could not parse a start time.");
      const end = defaultEnd(start);

      const { cal } = await getClients();
      const calendarId = "primary"; // TODO: map name→id from config
      const title = opts.intention ? `[ ] ${input}` : input;

      await cal.events.insert({
        calendarId,
        requestBody: {
          summary: title,
          start: { dateTime: toRFC3339(start) },
          end: { dateTime: toRFC3339(end) },
        },
      });
      console.log("✅  Event added.");
    });
  return cmd;
}
