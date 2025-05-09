/**
 * Safely access deeply nested properties when the type of the root value is unknown
 * @param obj The object to access properties from
 * @param path The path of properties to access, as a string with dot notation or an array of string keys
 * @param defaultValue Optional default value to return if the path doesn't exist
 * @returns The value at the specified path, or undefined/defaultValue if not found
 */

export function getNested<T = unknown>(
  obj: unknown,
  path: string | string[],
  defaultValue?: T
): T | undefined {
  // If the object is null or undefined, return the default value
  if (!obj) return defaultValue;

  // Convert string path to array (e.g., "a.b.c" -> ["a", "b", "c"])
  const keys = Array.isArray(path) ? path : path.split(".");

  // Start with the object
  let current: any = obj;

  // Traverse the path
  for (const key of keys) {
    // If current is null/undefined or key doesn't exist, return default value
    if (current == null || typeof current !== "object" || !(key in current)) {
      return defaultValue;
    }
    current = current[key];
  }

  // Return the final value (or default if it's undefined)
  return (current === undefined ? defaultValue : current) as T;
}
