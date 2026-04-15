import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    include: ["src/**/*.vitest.ts", "src/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // Only pure-logic lib files — no CF runtime, no browser APIs, no DB deps
      include: [
        "src/lib/scoring.ts",
        "src/lib/share.ts",
        "src/lib/theme-presets.ts",
        "src/lib/teams.ts",
        "src/lib/teams-extended.ts",
        "src/lib/font-presets.ts",
        "src/lib/source-validation.ts",
      ],
      thresholds: {
        statements: 95,
        branches: 85,
        functions: 100,
        lines: 95,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
