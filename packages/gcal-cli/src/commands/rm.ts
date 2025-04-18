import { Command } from "commander";
import { getClients } from "../google";

export function rmCmd(): Command {
  const cmd = new Command("rm")
    .description("Delete an event or task")
    .argument("<id>", "ID of the event or task to delete")
    .option("--account <name>", "Google account (default)")
    .action(async (id, opts) => {
      const { cal, tasks } = await getClients(opts.account);
      const calendarId = "primary";
      try {
        await cal.events.delete({ calendarId, eventId: id });
        console.log("✅ Event deleted.");
        return;
      } catch {
        // not an event
      }
      try {
        await tasks.tasks.delete({ tasklist: "@default", task: id });
        console.log("✅ Task deleted.");
      } catch (e) {
        console.error(`❌ Could not delete item: ${e}`);
      }
    });
  return cmd;
}
