import { generateKeyBetween } from "fractional-indexing";

const HASH_LENGTH = 12;
const ID_LENGTH = 4;

function generateSortableHash(timestamp = Date.now()) {
  // Ensure timestamp is a number
  timestamp = Number(timestamp);

  // Invert the timestamp by subtracting it from MAX_SAFE_INTEGER
  // This makes newer timestamps sort before older ones
  const invertedTimestamp = Number.MAX_SAFE_INTEGER - timestamp;

  // Convert inverted timestamp to base36 string
  const base36Timestamp = invertedTimestamp.toString(36);

  // Pad the start with zeros if needed to maintain sortability
  const maxTimestampLength = Math.ceil(Math.log(Number.MAX_SAFE_INTEGER) / Math.log(36));
  const paddedTimestamp = base36Timestamp.padStart(maxTimestampLength, "0");

  // If the padded timestamp is longer than desired length, take the rightmost characters
  // If it's shorter, pad with zeros on the right
  if (paddedTimestamp.length > HASH_LENGTH) {
    return paddedTimestamp.slice(-HASH_LENGTH);
  } else {
    return paddedTimestamp.padEnd(HASH_LENGTH, "0");
  }
}

export function createPosition(createdAt: number, id: string) {
  const hash = generateSortableHash(createdAt);
  const shortId = id.padEnd(ID_LENGTH, "0").slice(0, ID_LENGTH);
  return hash + shortId + "a0";
}

function splitPosition(position: string) {
  const prefix = position.slice(0, HASH_LENGTH + ID_LENGTH);
  if (prefix.length !== HASH_LENGTH + ID_LENGTH) {
    throw new Error("Position is shorter than the expected hash + id length");
  }
  const fractionalIndex = position.slice(HASH_LENGTH + ID_LENGTH);
  return { prefix, fractionalIndex };
}

export function createPositionBetween(a: string | null, b: string | null) {
  if (a && b) {
    const aParts = splitPosition(a);
    const bParts = splitPosition(b);
    if (aParts.prefix === bParts.prefix) {
      return aParts.prefix + generateKeyBetween(aParts.fractionalIndex, null);
    } else {
      return aParts.prefix + generateKeyBetween(aParts.fractionalIndex, bParts.fractionalIndex);
    }
  } else if (a) {
    const aParts = splitPosition(a);
    return aParts.prefix + generateKeyBetween(aParts.fractionalIndex, null);
  } else if (b) {
    const bParts = splitPosition(b);
    return bParts.prefix + generateKeyBetween(null, bParts.fractionalIndex);
  } else {
    return createPosition(Date.now(), crypto.randomUUID());
  }
}

function measureCreatePositionPerformance(iterations: number = 1000) {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const now = Date.now();
    const id = i.toString();
    const start = performance.now();
    createPosition(now, id);
    const end = performance.now();
    times.push(end - start);
  }

  const totalTime = times.reduce((sum, time) => sum + time, 0);
  const averageTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  console.log(`CreatePosition Performance Test (${iterations} iterations):`);
  console.log(`Average time: ${averageTime.toFixed(3)}ms`);
  console.log(`Min time: ${minTime.toFixed(3)}ms`);
  console.log(`Max time: ${maxTime.toFixed(3)}ms`);
  console.log(`Total time: ${totalTime.toFixed(3)}ms`);

  return {
    iterations,
    averageTime,
    minTime,
    maxTime,
    totalTime,
  };
}
