import { generateKeyBetween } from "fractional-indexing";

const HASH_LENGTH = 12;
const RANDOMNESS_LENGTH = 4;
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

function createPosition(createdAt: number, id: string) {
  const hash = generateSortableHash(createdAt);
  const fixedLengthId = id.padEnd(ID_LENGTH, "0").slice(0, ID_LENGTH);
  return hash + fixedLengthId + "a0";
}

function splitPosition(position: string) {
  const prefix = position.slice(0, HASH_LENGTH + ID_LENGTH);
  if (prefix.length !== HASH_LENGTH + ID_LENGTH) {
    throw new Error("Position is shorter than the expected hash + id length");
  }
  const fractionalIndex = position.slice(HASH_LENGTH + ID_LENGTH);
  return { prefix, fractionalIndex };
}
// function splitPosition(position: string) {
//   const hash = position.slice(0, HASH_LENGTH);
//   if (hash.length !== HASH_LENGTH) {
//     throw new Error("Position is shorter than the expected hash length");
//   }
//   const id = position.slice(HASH_LENGTH, HASH_LENGTH + ID_LENGTH);
//   if (id.length !== ID_LENGTH) {
//     throw new Error("Position is shorter than the expected id length");
//   }
//   const fractionalIndex = position.slice(HASH_LENGTH + ID_LENGTH);
//   return { hash, id, fractionalIndex };
// }

function createPositionBetween(a: string, b: string) {
  const aParts = splitPosition(a);
  const bParts = splitPosition(b);
  if (aParts.prefix === bParts.prefix) {
    return aParts.prefix + generateKeyBetween(aParts.fractionalIndex, null);
  } else {
    return aParts.prefix + generateKeyBetween(aParts.fractionalIndex, bParts.fractionalIndex);
  }
}

function generateSomeRandomness() {
  return crypto.randomUUID().slice(0, RANDOMNESS_LENGTH);
}

// export function createPosition(timestamp: number = Date.now()) {
//   return generateSortableHash(timestamp) + "-" + "a0" + "-" + generateSomeRandomness();
// }

// export function splitPosition(position: string) {
//   const [hash, fractionalIndex, randomness] = position.split("-");
//   if (!hash || hash.length !== HASH_LENGTH) throw new Error("Invalid position");
//   if (!fractionalIndex) throw new Error("Invalid position");
//   if (!randomness || randomness.length !== RANDOMNESS_LENGTH) throw new Error("Invalid position");
//   return { hash, fractionalIndex, randomness };
// }

export function createPositionBetween(
  before: string | null,
  after: string | null,
  timestamp: number = Date.now()
) {
  if (after && !before) {
    const afterParts = splitPosition(after);
    return [
      afterParts.hash,
      generateKeyBetween(null, afterParts.fractionalIndex),
      generateSomeRandomness(),
    ].join("-");
  } else if (before && !after) {
    const beforeParts = splitPosition(before);
    return [
      beforeParts.hash,
      generateKeyBetween(beforeParts.fractionalIndex, null),
      generateSomeRandomness(),
    ].join("-");
  } else if (before && after) {
    const beforeParts = splitPosition(before);
    const afterParts = splitPosition(after);
    const fractionIndex =
      afterParts.hash !== beforeParts.hash
        ? generateKeyBetween(beforeParts.fractionalIndex, null)
        : afterParts.fractionalIndex === beforeParts.fractionalIndex
        ? beforeParts.fractionalIndex
        : generateKeyBetween(beforeParts.fractionalIndex, afterParts.fractionalIndex);
    return [beforeParts.hash, fractionIndex, generateSomeRandomness()].join("-");
  } else {
    return createPosition(timestamp);
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
measureCreatePositionPerformance();
