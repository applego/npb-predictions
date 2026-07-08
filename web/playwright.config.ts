import { defineConfig, devices } from "@playwright/test";

const PORT = 3456;
const BASE_URL = `http://localhost:${PORT}`;
const persistArg = process.env.WRANGLER_PERSIST_TO
  ? ` --persist-to ${process.env.WRANGLER_PERSIST_TO}`
  : "";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // wrangler pages dev is single-process, avoid race conditions
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: BASE_URL,
    ...devices["Desktop Chrome"],
    // Capture on failure only
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },

  webServer: {
    // Build must happen before this (via `npm run build:cf`)
    command: `npx wrangler pages dev .vercel/output/static --port ${PORT} --compatibility-date=2025-01-01${persistArg}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
