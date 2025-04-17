import { parseDate } from "chrono-node";

export function parseNatural(text: string, base: Date = new Date()) {
  return parseDate(text, base, { forwardDate: true });
}

export function toRFC3339(d: Date) {
  return d.toISOString().replace(/\.\d+Z$/, "Z");
}

/** Default 15‑minute end if none supplied */
export function defaultEnd(start: Date): Date {
  return new Date(start.getTime() + 15 * 60 * 1000);
}
