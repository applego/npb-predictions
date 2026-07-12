export const runtime = "edge";

import type { MetadataRoute } from "next";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/db";
import {
  users,
  seasons as seasonsTable,
  predictions as predictionsTable,
  actualTeamStandings,
  scoreSnapshots,
} from "@/db/schema";
import { getAllSeasons } from "@/lib/seo-queries";
import { NPB_TEAMS } from "@/lib/teams";
import { absoluteUrl } from "@/lib/seo-meta";

type SitemapEntry = MetadataRoute.Sitemap[number];

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value * 1000);
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

async function safeCall<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Years — DB-driven with static fallback
  const seasons = await safeCall(getAllSeasons, [] as Awaited<ReturnType<typeof getAllSeasons>>);
  const years: number[] = seasons.length > 0 ? seasons.map((s) => s.year) : [2025, 2026];
  const latestYear = Math.max(...years);

  // Core static pages
  const staticPages: SitemapEntry[] = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1.0 },
    { url: absoluteUrl("/standings"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/rankings/predictions"), changeFrequency: "weekly", priority: 0.85 },
    { url: absoluteUrl("/rankings/commentators"), changeFrequency: "weekly", priority: 0.85 },
    { url: absoluteUrl("/rankings/all-time"), changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/rankings/scoreboard"), changeFrequency: "daily", priority: 0.85 },
    { url: absoluteUrl("/rankings/live"), changeFrequency: "hourly", priority: 0.9 },
    { url: absoluteUrl("/predictions"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/news"), changeFrequency: "daily", priority: 0.75 },
    { url: absoluteUrl("/resources"), changeFrequency: "weekly", priority: 0.55 },
    { url: absoluteUrl("/seo/past-seasons"), changeFrequency: "yearly", priority: 0.7 },
  ];

  // Scoreboard per year (new canonical path)
  const scoreboardPages: SitemapEntry[] = years.map((year) => ({
    url: absoluteUrl(`/rankings/scoreboard?year=${year}`),
    changeFrequency: year === latestYear ? "daily" : "yearly",
    priority: year === latestYear ? 0.85 : 0.6,
  }));

  // SEO year-based pages
  const seasonPages: SitemapEntry[] = years.flatMap((year) => {
    const freq: SitemapEntry["changeFrequency"] =
      year === latestYear ? "weekly" : "yearly";
    return [
      { url: absoluteUrl(`/seo/${year}`), changeFrequency: freq, priority: 0.8 },
      { url: absoluteUrl(`/seo/${year}/central/final-standings`), changeFrequency: freq, priority: 0.7 },
      { url: absoluteUrl(`/seo/${year}/pacific/final-standings`), changeFrequency: freq, priority: 0.7 },
      { url: absoluteUrl(`/seo/${year}/title-leaders`), changeFrequency: freq, priority: 0.7 },
      { url: absoluteUrl(`/seo/${year}/central/title-leaders`), changeFrequency: freq, priority: 0.6 },
      { url: absoluteUrl(`/seo/${year}/pacific/title-leaders`), changeFrequency: freq, priority: 0.6 },
      { url: absoluteUrl(`/seo/${year}/commentator-accuracy`), changeFrequency: freq, priority: 0.65 },
    ];
  });

  // Team pages — only the latest year (avoids index bloat)
  const teamPages: SitemapEntry[] = NPB_TEAMS.map((team) => ({
    url: absoluteUrl(`/seo/${latestYear}/teams/${team.slug}`),
    changeFrequency: "weekly" as const,
    priority: 0.55,
  }));

  // Archive pages per year
  const archivePages: SitemapEntry[] = years.flatMap((year) => [
    {
      url: absoluteUrl(`/archive/${year}`),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: absoluteUrl(`/archive/${year}/predictions`),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
  ]);

  // Commentator detail pages — prefer actual DB rows when available
  const commentatorRows = await safeCall(
    async () => {
      const db = getDb();
      return db
        .select({ slug: users.slug, createdAt: users.createdAt })
        .from(users)
        .where(eq(users.role, "commentator"));
    },
    [] as Array<{ slug: string; createdAt: unknown }>,
  );
  const commentatorPages: SitemapEntry[] = commentatorRows.map((c) => ({
    url: absoluteUrl(`/rankings/commentators/${c.slug}`),
    changeFrequency: "monthly" as const,
    priority: 0.6,
    lastModified: toDate(c.createdAt),
  }));

  // Public user pages — restricted to "friend" role users who have predictions
  const userRows = await safeCall(
    async () => {
      const db = getDb();
      // Users who have any prediction recorded → good signal to include in sitemap
      const predictors = await db
        .select({
          id: users.id,
          createdAt: users.createdAt,
          role: users.role,
        })
        .from(users);
      const predictedUserIds = await db
        .select({ userId: predictionsTable.userId })
        .from(predictionsTable);
      const withPred = new Set(predictedUserIds.map((p) => p.userId));
      return predictors.filter((u) => u.role === "friend" && withPred.has(u.id));
    },
    [] as Array<{ id: number; createdAt: unknown; role: string }>,
  );
  const userPages: SitemapEntry[] = userRows.map((u) => ({
    url: absoluteUrl(`/users/${u.id}`),
    changeFrequency: "weekly" as const,
    priority: 0.5,
    lastModified: toDate(u.createdAt),
  }));

  // lastModified signal for scoreboard/SEO pages via latest snapshot
  const latestSnapshotTs = await safeCall(
    async () => {
      const db = getDb();
      const [latestStanding] = await db
        .select({ d: actualTeamStandings.snapshotDate })
        .from(actualTeamStandings)
        .orderBy(desc(actualTeamStandings.snapshotDate))
        .limit(1);
      const [latestScore] = await db
        .select({ d: scoreSnapshots.snapshotDate })
        .from(scoreSnapshots)
        .orderBy(desc(scoreSnapshots.snapshotDate))
        .limit(1);
      const candidates = [toDate(latestStanding?.d), toDate(latestScore?.d)].filter(
        (x): x is Date => x instanceof Date,
      );
      if (candidates.length === 0) return undefined;
      return new Date(Math.max(...candidates.map((c) => c.getTime())));
    },
    undefined as Date | undefined,
  );

  if (latestSnapshotTs) {
    for (const entry of [...staticPages, ...scoreboardPages]) {
      entry.lastModified = latestSnapshotTs;
    }
  }

  return [
    ...staticPages,
    ...scoreboardPages,
    ...seasonPages,
    ...teamPages,
    ...archivePages,
    ...commentatorPages,
    ...userPages,
  ];
}
