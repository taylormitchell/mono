export const LOG_TYPES = ["meditated", "ankied", "eye-patch", "workout", "custom"] as const;

export type LogType = (typeof LOG_TYPES)[number];

import { z } from "zod";

export const LogEntrySchema = z.object({
  type: z.enum(LOG_TYPES),
  datetime: z
    .union([
      z.date(),
      z
        .string()
        .refine((str) => !isNaN(Date.parse(str)), {
          message: "Invalid date string",
          path: ["datetime"],
        })
        .transform((str) => new Date(str)),
    ])
    .default(() => new Date()),
  duration: z
    .string()
    .regex(/^\d+[hms]$/)
    .optional(),
  message: z.string().optional(),
});

export type LogEntry = z.infer<typeof LogEntrySchema>;

export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([hms])$/);
  if (!match) return 0;
  const [, value, unit] = match;
  switch (unit) {
    case "h":
      return parseInt(value) * 60 * 60;
    case "m":
      return parseInt(value) * 60;
    case "s":
      return parseInt(value);
    default:
      return 0;
  }
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0) parts.push(`${remainingSeconds}s`);
  return parts.join(" ");
}

export function validateDuration(duration: string | undefined): boolean {
  if (duration && !/^\d+[hms]$/.test(duration)) {
    console.error(
      "Invalid duration format. Use a number followed by 'h' (hours), 'm' (minutes), or 's' (seconds)."
    );
    return false;
  }
  return true;
}

export function validateDatetime(datetime: string | undefined): boolean {
  if (datetime && isNaN(Date.parse(datetime))) {
    console.error(
      "Invalid datetime format. Use ISO 8601 format (e.g., '2023-04-15T14:30:00-04:00')"
    );
    return false;
  }
  return true;
}
