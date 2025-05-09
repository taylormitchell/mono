/**
 * Date time utility functions for calendar and task operations
 */

/**
 * Get start of day in ISO format
 */
export function getStartOfDay(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Get end of day in ISO format
 */
export function getEndOfDay(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

/**
 * Get date with offset from today
 */
export function getDateWithOffset(offsetDays: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date;
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format time as HH:MM (local time)
 */
export function formatTime(date: Date = new Date()): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format date and time as YYYY-MM-DD HH:MM
 */
export function formatDateTime(date: Date = new Date()): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

/**
 * Parse date string using natural language
 * This is a placeholder - in a real implementation, we would use a library like chrono-node
 */
export function parseDate(dateString: string): Date {
  // Simple handling for relative dates
  if (dateString === 'today') {
    return new Date();
  }
  
  if (dateString === 'tomorrow') {
    return getDateWithOffset(1);
  }
  
  // Handle "+X" or "-X" format for days relative to today
  if (/^[+-]\d+$/.test(dateString)) {
    return getDateWithOffset(parseInt(dateString));
  }
  
  // Try to parse as standard date string
  const parsedDate = new Date(dateString);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate;
  }
  
  // Default to today if we can't parse
  return new Date();
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}

/**
 * Convert local time to ISO string for API requests
 */
export function toISOString(date: Date, time?: string): string {
  const d = new Date(date);
  
  // If time string is provided (format: HH:MM), parse and set the time
  if (time) {
    const [hours, minutes] = time.split(':').map(Number);
    d.setHours(hours || 0, minutes || 0, 0, 0);
  }
  
  return d.toISOString();
}