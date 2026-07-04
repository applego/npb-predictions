export interface ScrapeSourceStatus {
  source: string;
  unresolvedCount: number;
  latestError: string | null;
  latestAt: string | null;
  latestHtmlSnippet: string | null;
  latestHttpStatus: number | null;
}

export const SCRAPE_HEALTH_ATTENTION_THRESHOLD = 3;
export const SCRAPE_HEALTH_ATTENTION_WINDOW_MS = 12 * 60 * 60 * 1000;

export function needsScrapeAttention(
  status: ScrapeSourceStatus,
  now: Date = new Date(),
): boolean {
  if (status.unresolvedCount < SCRAPE_HEALTH_ATTENTION_THRESHOLD) {
    return false;
  }
  if (!status.latestAt) {
    return false;
  }

  const latestAtMs = Date.parse(status.latestAt);
  if (Number.isNaN(latestAtMs)) {
    return false;
  }

  return now.getTime() - latestAtMs <= SCRAPE_HEALTH_ATTENTION_WINDOW_MS;
}
