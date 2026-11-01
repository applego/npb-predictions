import { NPB_TEAMS } from "@/lib/teams";

/**
 * Season whose newspaper images are served as static files (web/public/newspaper/<year>/<slug>.png).
 * Rendering the 720x1280 newspaper with ImageResponse inside the Worker hit the resource limit (1102)
 * and the failed isolate then answered unrelated pages with 503 (2026-11-01, deployment 8de37839).
 * Once a season is final its newspaper no longer changes, so it is drawn once and served without a Worker.
 * Clear this when the next season starts and the images change daily again.
 */
export const ARCHIVED_NEWSPAPER_YEAR: number | null = 2026;

const ARCHIVED_SLUGS = new Set(NPB_TEAMS.map((team) => team.slug));

export function archivedNewspaperPath(slug: string): string | null {
  if (ARCHIVED_NEWSPAPER_YEAR === null || !ARCHIVED_SLUGS.has(slug)) return null;
  return `/newspaper/${ARCHIVED_NEWSPAPER_YEAR}/${slug}.png`;
}
