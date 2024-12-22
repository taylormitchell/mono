import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

const HASH_LENGTH = 12;

const RANDOM_LENGTH = 8;

function generateReverseSortableTimestampHash(timestamp = Date.now(), length = HASH_LENGTH) {
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
  if (paddedTimestamp.length > length) {
    return paddedTimestamp.slice(-length);
  } else {
    return paddedTimestamp.padEnd(length, "0");
  }
}

export function createPosition(createdAt: number) {
  const createdAtHash = generateReverseSortableTimestampHash(createdAt, HASH_LENGTH);
  return createdAtHash + "a0";
}

function splitPosition(position: string) {
  const createdAtHash = position.slice(0, HASH_LENGTH);
  if (createdAtHash.length !== HASH_LENGTH) {
    throw new Error("Position is shorter than the expected hash length");
  }
  const fractionalIndex = position.slice(HASH_LENGTH);
  return { createdAtHash, fractionalIndex };
}

export function createPositionBetween(a: string | null, b: string | null) {
  if (a && b) {
    const aParts = splitPosition(a);
    const bParts = splitPosition(b);
    if (aParts.createdAtHash === bParts.createdAtHash) {
      return (
        aParts.createdAtHash + generateKeyBetween(aParts.fractionalIndex, bParts.fractionalIndex)
      );
    } else {
      return aParts.createdAtHash + generateKeyBetween(aParts.fractionalIndex, null);
    }
  } else if (a) {
    const aParts = splitPosition(a);
    return aParts.createdAtHash + generateKeyBetween(aParts.fractionalIndex, null);
  } else if (b) {
    const bParts = splitPosition(b);
    return bParts.createdAtHash + generateKeyBetween(null, bParts.fractionalIndex);
  } else {
    return createPosition(Date.now());
  }
}

/**
 * Creates N positions between a and b
 *
 * @throws Error if a and b are the same
 */
export function createNPositionsBetween(a: string | null, b: string | null, n: number) {
  if (a && b) {
    if (a === b) {
      throw new Error("Cannot create N positions between the same position");
    }
    const aParts = splitPosition(a);
    const bParts = splitPosition(b);
    if (aParts.createdAtHash === bParts.createdAtHash) {
      const indices = generateNKeysBetween(aParts.fractionalIndex, bParts.fractionalIndex, n);
      return indices.map((index) => aParts.createdAtHash + index);
    } else {
      const indices = generateNKeysBetween(aParts.fractionalIndex, null, n);
      return indices.map((index) => aParts.createdAtHash + index);
    }
  } else if (a) {
    const aParts = splitPosition(a);
    const indices = generateNKeysBetween(aParts.fractionalIndex, null, n);
    return indices.map((index) => aParts.createdAtHash + index);
  } else if (b) {
    const bParts = splitPosition(b);
    const indices = generateNKeysBetween(null, bParts.fractionalIndex, n);
    return indices.map((index) => bParts.createdAtHash + index);
  } else {
    const createdAtHash = generateReverseSortableTimestampHash(Date.now(), HASH_LENGTH);
    const indices = generateNKeysBetween(null, null, n);
    return indices.map((index) => createdAtHash + index);
  }
}

export function getNewPositions<T>(
  items: T[],
  getPosition: (item: T) => string,
  toIndex: number
): {
  newPosition: string;
  rePositions: Map<number, string>;
} {
  /**
   *
   * 999zz
   * 123a0 ← toIndex    123a0
   * 123a0              123a1
   * 123a0 ← fromIndex  123a2
   * 123a0              123a3
   * 123a1 ← nextIndexWithDifferentPosition
   *
   * 999zz
   * 123a0 ← toIndex
   * 123a0
   * 123a0
   * 222a0 ← nextIndexWithDifferentPosition
   *
   *
   */

  const itemAbove = items[toIndex]; // TODO handle case where toIndex outside of items
  const positionAbove = itemAbove ? getPosition(itemAbove) : null;
  let nextItemWithDiffPositionIndex = toIndex + 1;
  while (nextItemWithDiffPositionIndex < items.length) {
    const item = items[nextItemWithDiffPositionIndex];
    const position = getPosition(item);
    if (position !== positionAbove) {
      break;
    }
    nextItemWithDiffPositionIndex++;
  }
  const itemBelow = items[nextItemWithDiffPositionIndex];
  const positionBelow = itemBelow ? getPosition(itemBelow) : null;
  const n = nextItemWithDiffPositionIndex - toIndex;

  const newPositions = createNPositionsBetween(positionAbove, positionBelow, n);

  return {
    newPosition: newPositions[0],
    rePositions: new Map(
      newPositions.slice(1).map((position, index) => [toIndex + index + 1, position])
    ),
  };
}

// function measureCreatePositionPerformance(iterations: number = 1000) {
//   const times: number[] = [];

//   for (let i = 0; i < iterations; i++) {
//     const now = Date.now();
//     const id = i.toString();
//     const start = performance.now();
//     createPosition(now, id);
//     const end = performance.now();
//     times.push(end - start);
//   }

//   const totalTime = times.reduce((sum, time) => sum + time, 0);
//   const averageTime = totalTime / iterations;
//   const minTime = Math.min(...times);
//   const maxTime = Math.max(...times);

//   console.log(`CreatePosition Performance Test (${iterations} iterations):`);
//   console.log(`Average time: ${averageTime.toFixed(3)}ms`);
//   console.log(`Min time: ${minTime.toFixed(3)}ms`);
//   console.log(`Max time: ${maxTime.toFixed(3)}ms`);
//   console.log(`Total time: ${totalTime.toFixed(3)}ms`);

//   return {
//     iterations,
//     averageTime,
//     minTime,
//     maxTime,
//     totalTime,
//   };
// }
