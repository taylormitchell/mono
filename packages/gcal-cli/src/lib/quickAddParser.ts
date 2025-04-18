import { parseDate } from "chrono-node";

/**
 * Parses quick-add input like "Review PR til 4pm" or "Work on X for 1h".
 * Returns the cleaned title, start and end Date objects.
 */
export function parseQuickAdd(input: string): { title: string; start: Date; end: Date } {
  const now = new Date();
  let start = now;
  let end: Date;
  let working = input;

  // Match duration e.g. "for 1h", "for 30m"
  const durRegex = /\bfor\s+(\d+(?:\.\d+)?)(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/i;
  const durMatch = durRegex.exec(working);
  if (durMatch) {
    const value = parseFloat(durMatch[1]);
    const unit = durMatch[2].toLowerCase();
    let ms = 0;
    if (unit.startsWith("h")) {
      ms = value * 60 * 60 * 1000;
    } else {
      ms = value * 60 * 1000;
    }
    end = new Date(start.getTime() + ms);
    working = working.replace(durMatch[0], "");
  } else {
    // Match end time e.g. "til 4pm", "until 11:30"
    const tilRegex = /\b(?:til|until)\s+(.+)$/i;
    const tilMatch = tilRegex.exec(working);
    if (tilMatch) {
      const timeStr = tilMatch[1].trim();
      const parsed = parseDate(timeStr, now, { forwardDate: true });
      if (!parsed) throw new Error(`Could not parse end time '${timeStr}'`);
      end = parsed;
      working = working.slice(0, tilMatch.index);
    } else {
      // Fallback: parse a point in time for start, default 15-minute duration
      const parsed = parseDate(working, now, { forwardDate: true });
      if (!parsed) throw new Error("Could not parse a time from input");
      start = parsed;
      end = new Date(start.getTime() + 15 * 60 * 1000);
      // title remains full input
    }
  }

  const title = working.trim();
  return { title, start, end };
}