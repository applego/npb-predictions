/**
 * Shift an ISO calendar date without depending on the runtime timezone.
 *
 * Game routes are keyed by a calendar date, not an instant in time. Using
 * Date.UTC keeps Cloudflare's UTC runtime from shifting JST routes backwards.
 */
export function shiftIsoDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
