import { comparePositions } from "./utils";

export function moveTo(
  items: { id: string; createdAt: string }[],
  from: number,
  to: number,
  partialPositions: Record<string, number>
) {
  const sortedItems = [...items].sort((a, b) => comparePositions(a, b, partialPositions));
  const toClamped = Math.max(0, Math.min(to, sortedItems.length - 1));
  if (from !== toClamped) {
    const item = sortedItems[from];
    sortedItems.splice(from, 1);
    sortedItems.splice(toClamped, 0, item);
  }
  return sortedItems.reduce((acc, item, i) => {
    acc[item.id] = i;
    return acc;
  }, {} as Record<string, number>);
}
