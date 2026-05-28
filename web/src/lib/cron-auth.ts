// Edge-runtime safe access to cron / admin secrets.
//
// On Cloudflare Pages, `process.env` only carries the values that
// @cloudflare/next-on-pages chose to expose at build time (mainly the
// `NEXT_PUBLIC_*` ones). Runtime secrets like `CRON_SECRET` live on the
// request context bindings (`env.CRON_SECRET`).
//
// Reading from `process.env` first preserves local-dev parity (vitest /
// `npm run dev`) where Cloudflare bindings aren't available.

import { getRequestContext } from "@cloudflare/next-on-pages";

function readSecret(name: "CRON_SECRET" | "ADMIN_SECRET"): string | undefined {
  // Local dev / unit tests
  const fromProcess = process.env[name];
  if (fromProcess) return fromProcess;
  // Cloudflare Pages production / preview
  try {
    const env = (getRequestContext().env as unknown as Record<string, string | undefined>);
    return env?.[name];
  } catch {
    // getRequestContext() throws when there's no active request context
    // (e.g. during a unit test). Fall back to undefined.
    return undefined;
  }
}

export interface CronAuthResult {
  authorized: boolean;
  reason?: "no-secret-configured" | "missing-header" | "secret-mismatch";
}

/**
 * Accept either `x-cron-secret` (cron jobs) or `x-admin-secret` (admin UI).
 * If neither env var is set, the endpoint is treated as disabled (caller can
 * decide whether to 503 or allow open access).
 */
export function checkCronAuth(req: Request): CronAuthResult {
  const cronSecret = readSecret("CRON_SECRET");
  const adminSecret = readSecret("ADMIN_SECRET");

  if (!cronSecret && !adminSecret) {
    return { authorized: false, reason: "no-secret-configured" };
  }

  const incomingCron = req.headers.get("x-cron-secret");
  const incomingAdmin = req.headers.get("x-admin-secret");

  if (cronSecret && incomingCron === cronSecret) return { authorized: true };
  if (adminSecret && incomingAdmin === adminSecret) return { authorized: true };

  if (!incomingCron && !incomingAdmin) {
    return { authorized: false, reason: "missing-header" };
  }
  return { authorized: false, reason: "secret-mismatch" };
}
