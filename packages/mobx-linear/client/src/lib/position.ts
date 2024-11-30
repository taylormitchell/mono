/**
 * Generates a sortable, fixed-length hash from a timestamp
 * @param {number} [timestamp=Date.now()] - Optional timestamp to hash
 * @param {number} [length=12] - Desired length of the output hash
 * @returns {string} A fixed-length, sortable hash
 */
function generateSortableHash(timestamp = Date.now(), length = 12) {
  // Ensure timestamp is a number
  timestamp = Number(timestamp);

  // Convert timestamp to a base36 string (using digits 0-9 and letters a-z)
  // This keeps the string sortable while reducing length
  const base36Timestamp = timestamp.toString(36);

  // Pad the start with zeros if needed to maintain sortability
  const maxTimestampLength = Math.ceil(Math.log(Number.MAX_SAFE_INTEGER) / Math.log(36));
  const paddedTimestamp = base36Timestamp.padStart(maxTimestampLength, "0");

  // If the padded timestamp is longer than desired length, take the rightmost characters
  // If it's shorter, pad with zeros on the right
  if (paddedTimestamp.length > length) {
    return paddedTimestamp.slice(-length);
  } else {
    return paddedTimestamp.padEnd(length, "0");
  }
}
