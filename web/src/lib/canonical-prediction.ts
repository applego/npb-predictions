export const PUBLIC_RESULTS_SELECTION = "locked-commentators:original-first,createdAt-ascending,predictionId-ascending;before-league-or-score";

/** Select before scoring or league filtering; never choose a better-scoring variant. */
export function canonicalPredictions<T extends {
  userId: number; predictionId: number; variant: string | null; createdAt: string;
}>(rows: T[]): T[] {
  const ordered = [...rows].sort((a, b) =>
    Number(Boolean(a.variant)) - Number(Boolean(b.variant)) ||
    a.createdAt.localeCompare(b.createdAt) || a.predictionId - b.predictionId,
  );
  const firstByUser = new Map<number, T>();
  for (const row of ordered) if (!firstByUser.has(row.userId)) firstByUser.set(row.userId, row);
  return [...firstByUser.values()];
}
