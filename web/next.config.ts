import type { NextConfig } from "next";

// Use an async IIFE to avoid top-level await (incompatible with Next.js CJS compilation)
if (process.env.NODE_ENV === "development") {
  (async () => {
    const { setupDevPlatform } = await import(
      "@cloudflare/next-on-pages/next-dev"
    );
    await setupDevPlatform();
  })();
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
