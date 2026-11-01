/** Rows per page in the scoreboard trend table. All rows at once (400+) exceeded the Worker resource limit. */
export const TREND_PAGE_SIZE = 50;

export interface TrendPage {
  page: number;
  pages: number;
  /** 0-based slice bounds into the sorted rows. */
  start: number;
  end: number;
}

/** Out-of-range or malformed `page` values fall back to the nearest valid page. */
export function trendPage(rawPage: string | undefined, total: number, size = TREND_PAGE_SIZE): TrendPage {
  const pages = Math.max(1, Math.ceil(total / size));
  const requested = Number.parseInt(rawPage ?? "1", 10);
  const page = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), pages) : 1;
  const start = (page - 1) * size;
  return { page, pages, start, end: Math.min(start + size, total) };
}
