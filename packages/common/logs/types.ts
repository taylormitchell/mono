import { z } from "zod";

// z.enum(["meditated", "ankied", "eye-patch", "workout", "custom"]),

export const DatetimeSchema = z.union([
  z.date(),
  z
    .string()
    .refine((str) => !isNaN(Date.parse(str)), {
      message: "Invalid date string",
      path: ["datetime"],
    })
    .transform((str) => new Date(str)),
]);

export const DurationSchema = z.string().regex(/^\d+[hms]$/);

export const LogEntrySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("meditated"),
    datetime: DatetimeSchema,
    duration: DurationSchema.optional(),
    message: z.string().optional(),
  }),
  z.object({
    type: z.literal("eye-patch"),
    datetime: DatetimeSchema,
    duration: DurationSchema.optional(),
    message: z.string().optional(),
  }),
  z.object({
    type: z.literal("ankied"),
    datetime: DatetimeSchema,
    duration: DurationSchema.optional(),
    message: z.string().optional(),
  }),
  z.object({
    type: z.literal("workout"),
    datetime: DatetimeSchema,
    duration: DurationSchema.optional(),
    message: z.string().optional(),
  }),
  z.object({
    type: z.literal("custom"),
    datetime: DatetimeSchema,
    duration: DurationSchema.optional(),
    message: z.string().optional(),
  }),
  z.object({
    type: z.literal("poop"),
    datetime: DatetimeSchema,
    duration: DurationSchema.optional(),
    effort: z.number().int().min(1).max(5).optional(),
    emptiness: z.number().int().min(1).max(5).optional(),
    burning: z.boolean().optional(),
    poopType: z.number().int().min(1).max(7).optional(),
    message: z.string().optional(),
  }),
]);

export const LOG_TYPES = new Set(LogEntrySchema.options.map((option) => option.shape.type.value));

export type LogType = typeof LOG_TYPES extends Set<infer T> ? T : never;

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
