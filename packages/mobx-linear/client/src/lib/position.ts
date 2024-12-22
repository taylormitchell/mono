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

/**
 *
 * - items must be sorted
 * - used for inserting a new item in the list. if you want to move an item,
 *   use {@link getNewPositionsForMove} instead
 *
 * TODO: add tests
 * TODO: maybe add helper for moving (or just better interface?)
 */
export function getNewPositionsForInsert<T>(
  items: T[],
  getPosition: (item: T) => string,
  insertAfterIndex: number
): {
  newPosition: string;
  rePositions: Map<T, string>;
} {
  const positionAbove = items[insertAfterIndex] ? getPosition(items[insertAfterIndex]) : null;
  let nextItemWithDiffPositionIndex = insertAfterIndex + 1;
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
  const n = nextItemWithDiffPositionIndex - insertAfterIndex;
  const newPositions = createNPositionsBetween(positionAbove, positionBelow, n);

  return {
    newPosition: newPositions[0],
    rePositions: new Map(
      newPositions
        .slice(1)
        .map((position, index) => [items[insertAfterIndex + index + 1], position])
    ),
  };
}

/**
 * - items must be sorted
 */
export function getNewPositionsForMove<T>(
  items: T[],
  getPosition: (item: T) => string,
  fromIndex: number,
  toIndex: number
) {
  if (fromIndex === toIndex || items.length <= 1) {
    return new Map();
  }
  const itemToMove = items[fromIndex];
  if (!itemToMove) {
    throw new Error("Item to move not found");
  }
  const newToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
  const filteredItems = items.filter((i) => i !== itemToMove);
  const { newPosition, rePositions } = getNewPositionsForInsert(
    filteredItems,
    getPosition,
    newToIndex
  );
  rePositions.set(itemToMove, newPosition);
  return rePositions;
}
