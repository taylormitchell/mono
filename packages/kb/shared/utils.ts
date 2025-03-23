/**
 * Returns a timestamp with the current timezone offset
 * Example: "2024-01-20T15:30:45-05:00"
 */
export const getTimestampWithTimezone = (): string => {
  return toTimestampWithTimezone(new Date());
};

/**
 * Returns a timestamp with the current timezone offset
 * Example: "2024-01-20T15:30:45-05:00"
 */
export const toTimestampWithTimezone = (date: Date): string => {
  const timezoneOffset = -date.getTimezoneOffset();
  const sign = timezoneOffset >= 0 ? "+" : "-";
  const pad = (num: number) => String(Math.floor(Math.abs(num))).padStart(2, "0");
  const hours = pad(timezoneOffset / 60);
  const minutes = pad(timezoneOffset % 60);

  // Get local date/time components
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${hours}:${minutes}`;
};
