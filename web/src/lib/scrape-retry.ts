/**
 * Common retry + failure logging wrapper for scrapers.
 * Edge-runtime safe.
 */

import type { DbClient } from "@/db";
import { scrapeFailureEvents } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export interface RetryOptions {
  attempts?: number;
  backoffMs?: number;
  label: string;
  db?: DbClient;
}

export type RetryResult<T> =
  | { ok: true; value: T; attempts: number }
  | { ok: false; error: unknown; attempts: number };

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = 500;

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "...[truncated]";
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions,
): Promise<RetryResult<T>> {
  const attempts = opts.attempts ?? DEFAULT_ATTEMPTS;
  const backoff = opts.backoffMs ?? DEFAULT_BACKOFF_MS;
  let lastErr: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      const value = await fn();
      return { ok: true, value, attempts: i + 1 };
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, backoff * Math.pow(2, i)));
      }
    }
  }

  if (opts.db) {
    try {
      await logScrapeFailure(opts.db, opts.label, lastErr);
    } catch {
      // never let failure logging block the caller
    }
  }

  return { ok: false, error: lastErr, attempts };
}

export async function logScrapeFailure(
  db: DbClient,
  source: string,
  error: unknown,
  htmlSnippet?: string,
  httpStatus?: number,
): Promise<void> {
  const errorMessage =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  await db.insert(scrapeFailureEvents).values({
    source,
    errorMessage: truncate(errorMessage, 500),
    httpStatus: httpStatus ?? null,
    htmlSnippet: htmlSnippet ? truncate(htmlSnippet, 2048) : null,
  });
}

/**
 * Mark all unresolved failure events for a source as resolved.
 * Called when a scrape succeeds after previous failures.
 */
export async function markSourceResolved(
  db: DbClient,
  source: string,
): Promise<void> {
  await db
    .update(scrapeFailureEvents)
    .set({ resolvedAt: new Date() })
    .where(
      and(
        eq(scrapeFailureEvents.source, source),
        isNull(scrapeFailureEvents.resolvedAt),
      ),
    );
}

export async function countRecentFailures(
  db: DbClient,
  source: string,
  sinceMs: number = 3600_000, // default 1h
): Promise<number> {
  const cutoff = new Date(Date.now() - sinceMs);
  const rows = await db
    .select()
    .from(scrapeFailureEvents)
    .where(
      and(
        eq(scrapeFailureEvents.source, source),
        isNull(scrapeFailureEvents.resolvedAt),
      ),
    );
  // filter in memory by createdAt to avoid SQL comparison complexity
  return rows.filter((r) => r.createdAt >= cutoff).length;
}
