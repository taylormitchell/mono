export function cn(...args: (string | undefined | null)[]) {
  return args.filter(Boolean).join(" ");
}
export function comparePositions(
  a: { id: string; createdAt: string },
  b: { id: string; createdAt: string },
  partialPositions: Record<string, number>
) {
  const aPos = partialPositions[a.id] ?? null;
  const bPos = partialPositions[b.id] ?? null;
  if (aPos === null && bPos === null) {
    if (b.createdAt === a.createdAt) {
      return b.id.localeCompare(a.id);
    } else {
      return b.createdAt.localeCompare(a.createdAt);
    }
  }
  if (aPos === null) return -1;
  if (bPos === null) return 1;
  return aPos < bPos ? -1 : 1;
}

/**
 * Get a timestamp with the current timezone
 *
 * Example: If it's 8:00 AM EST on February 15, 2025, this will return
 * "2025-02-15T08:00:00-05:00"
 */
export const getTimestampWithTimezone = (): string => {
  // Get timezone offset
  const now = new Date();
  const timezoneOffset = -now.getTimezoneOffset();
  const sign = timezoneOffset >= 0 ? "+" : "-";
  const pad = (num: number) => String(Math.floor(Math.abs(num))).padStart(2, "0");
  const hours = pad(timezoneOffset / 60);
  const minutes = pad(timezoneOffset % 60);

  // Get local date/time components
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${hours}:${minutes}`;
};
