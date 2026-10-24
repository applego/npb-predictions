// Shared public projection: adding a users column must not publish it implicitly.
export const publicPredictionRelations = {
  user: { columns: {
    id: true, name: true, slug: true, avatarUrl: true, role: true,
    source: true, sourceUrl: true, variant: true,
  } },
  rankingPicks: true,
  titlePicks: true,
} as const;

export function validSeasonYear(value: string): boolean {
  return /^20\d{2}$/.test(value);
}
