import { Command } from "commander";
import { DateTime } from "luxon";
import { getClients } from "../google";
import { editBuffer } from "../editor";
import { parseNatural, toRFC3339 } from "../time";

export function editCmd(): Command {
  const cmd = new Command("edit")
    .description("Edit an event")
    .argument("<id>", "ID of the event to edit")
    .option("--account <name>", "Google account (default)")
    .option("--cal <names>", 'Comma-separated calendar names. Defaults to "Work Intentions,Intentions"')
    .action(async (id, opts) => {
      const { cal } = await getClients(opts.account);
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
        const cid = calMap[name.toLowerCase()];
        if (!cid) throw new Error(`Calendar "${name}" not found`);
        calIds.push(cid);
      }
      let ev: any;
      let calendarIdFound: string | undefined;
      for (const cid of calIds) {
        try {
          ev = await cal.events.get({ calendarId: cid, eventId: id });
          calendarIdFound = cid;
          break;
        } catch (e: any) {
          if (e.code === 404 || e.response?.status === 404) {
            continue;
          }
          throw e;
        }
      }
      if (!ev || !calendarIdFound) {
        throw new Error(`Event "${id}" not found in calendars ${calNames.join(", ")}`);
      }
      const event = ev.data;
      const summary = event.summary || "";
      const startISO = event.start?.dateTime ?? event.start?.date;
      const endISO = event.end?.dateTime ?? event.end?.date;
      if (!startISO || !endISO) {
        throw new Error("Event has no start or end time");
      }
      const startStr = DateTime.fromISO(startISO).toFormat("yyyy-MM-dd HH:mm");
      const endStr = DateTime.fromISO(endISO).toFormat("yyyy-MM-dd HH:mm");
      const description = event.description || "";
      const initial = `Title: ${summary}
Start: ${startStr}
End:   ${endStr}
Description:
${description}
`;
      const output = editBuffer(initial);
      const lines = output.split(/\r?\n/);
      const titleLine = lines.find((l) => l.startsWith("Title:"));
      const startLine = lines.find((l) => l.startsWith("Start:"));
      const endLine = lines.find((l) => l.startsWith("End:"));
      const descIndex = lines.findIndex((l) => l.startsWith("Description:"));
      const descLines = descIndex >= 0 ? lines.slice(descIndex + 1) : [];
      const newSummary = titleLine
        ? titleLine.replace(/^Title:/, "").trim()
        : summary;
      const newStart = startLine
        ? parseNatural(startLine.replace(/^Start:/, "").trim())
        : null;
      const newEnd = endLine
        ? parseNatural(endLine.replace(/^End:/, "").trim())
        : null;
      const newDesc = descLines.join("\n");
      const req: any = {
        summary: newSummary,
        start: { dateTime: newStart ? toRFC3339(newStart) : startISO },
        end: { dateTime: newEnd ? toRFC3339(newEnd) : endISO },
        description: newDesc,
      };
      await cal.events.patch({
        calendarId: calendarIdFound,
        eventId: id,
        requestBody: req,
      });
      console.log("✅ Event updated.");
    });
  return cmd;
}
