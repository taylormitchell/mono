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
