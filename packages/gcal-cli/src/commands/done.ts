import { Command } from "commander";
import { getClients } from "../google";

export function doneCmd(): Command {
  const cmd = new Command("done")
    .description("Mark an intention or task done")
    .argument("<id>", "ID of the event or task to mark done")
    .option("--account <name>", "Google account (default)")
    .action(async (id, opts) => {
      const { cal, tasks } = await getClients(opts.account);
      const calendarId = "primary";
      try {
        const ev = await cal.events.get({ calendarId, eventId: id });
        const event = ev.data;
        const summary = event.summary || "";
        const newSummary = summary.startsWith("[ ] ") ? summary.slice(4) : summary;
        await cal.events.patch({
          calendarId,
          eventId: id,
          requestBody: { summary: newSummary },
        });
        console.log("✅ Event marked done.");
        return;
      } catch {
        // not an event or failed, try as task
      }
      try {
        await tasks.tasks.patch({
          tasklist: "@default",
          task: id,
          requestBody: { status: "completed" },
        });
        console.log("✅ Task marked completed.");
      } catch (e) {
        console.error(`❌ Could not mark item done: ${e}`);
      }
    });
  return cmd;
}
