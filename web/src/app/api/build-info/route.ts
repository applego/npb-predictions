export const runtime = "edge";

/**
 * GET /api/build-info
 *
 * Returns the commit SHA / branch / build timestamp baked into THIS deploy.
 * Used by npb-cf-deploy-watch.yml to detect deploy-freshness staleness:
 *
 *   served = curl /api/build-info → commitSha
 *   latest = git log -1 origin/main
 *   if served != latest AND latest_age > 30min ⇒ open issue
 *
 * Values are injected at build time via next.config.ts.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    commitSha: process.env.NEXT_PUBLIC_COMMIT_SHA ?? "unknown",
    commitShaShort: (process.env.NEXT_PUBLIC_COMMIT_SHA ?? "unknown").slice(0, 7),
    branch: process.env.NEXT_PUBLIC_BRANCH ?? "unknown",
    builtAt: process.env.NEXT_PUBLIC_BUILT_AT ?? null,
    serverNow: new Date().toISOString(),
  });
}
