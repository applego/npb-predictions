import type { NextConfig } from "next";
import { execSync } from "node:child_process";

// Use an async IIFE to avoid top-level await (incompatible with Next.js CJS compilation)
if (process.env.NODE_ENV === "development") {
  (async () => {
    const { setupDevPlatform } = await import(
      "@cloudflare/next-on-pages/next-dev"
    );
    await setupDevPlatform();
  })();
}

// ── Build-time deploy provenance ─────────────────────────────────────────
// Surfaced via /api/build-info so npb-cf-deploy-watch.yml can detect when
// the deploy serving production lags behind origin/main (deploy-freshness).
// (rebuild trigger: CRON_SECRET rotation 2026-05-28T01:50Z)
function readGitSha(): string {
  if (process.env.NEXT_PUBLIC_COMMIT_SHA) return process.env.NEXT_PUBLIC_COMMIT_SHA;
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  if (process.env.CF_PAGES_COMMIT_SHA) return process.env.CF_PAGES_COMMIT_SHA;
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function readGitBranch(): string {
  if (process.env.NEXT_PUBLIC_BRANCH) return process.env.NEXT_PUBLIC_BRANCH;
  if (process.env.GITHUB_REF_NAME) return process.env.GITHUB_REF_NAME;
  if (process.env.CF_PAGES_BRANCH) return process.env.CF_PAGES_BRANCH;
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const COMMIT_SHA = readGitSha();
const BRANCH = readGitBranch();
const BUILT_AT = new Date().toISOString();

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  env: {
    NEXT_PUBLIC_COMMIT_SHA: COMMIT_SHA,
    NEXT_PUBLIC_BRANCH: BRANCH,
    NEXT_PUBLIC_BUILT_AT: BUILT_AT,
  },
};

export default nextConfig;
