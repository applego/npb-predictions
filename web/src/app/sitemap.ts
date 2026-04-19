export const runtime = "edge";

import type { MetadataRoute } from "next";
import { getDb } from "@/db";
import { desc, eq } from "drizzle-orm";
import { users, predictions, scoreSnapshots } from "@/db/schema";
import { getAllSeasons } from "@/lib/seo-queries";
import { NPB_TEAMS } from "@/lib/teams";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  "https://npb-predictions.pages.dev";

type Entry = MetadataRoute.Sitemap[number];

function entry(
  path: string,
  opts: { lastModified?: Date; changeFrequency?: Entry["changeFrequency"]; priority?: number } = {}
): Entry {
  return {
    url: `${BASE_URL}${path}`,
    ...(opts.lastModified ? { lastModified: opts.lastModified } : {}),
    ...(opts.changeFrequency ? { changeFrequency: opts.changeFrequency } : {}),
    ...(opts.priority !== undefined ? { priority: opts.priority } : {}),
  };
}

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Seed static pages (always present)
  const staticPages: MetadataRoute.Sitemap = [
    entry("/", { changeFrequency: "daily", priority: 1.0 }),
    entry("/standings", { changeFrequency: "daily", priority: 0.9 }),
    entry("/predictions", { changeFrequency: "weekly", priority: 0.8 }),
    entry("/predictions/new", { changeFrequency: "monthly", priority: 0.6 }),
    entry("/seo/past-seasons", { changeFrequency: "weekly", priority: 0.7 }),
  ];

  // Dynamic: seasons
  const seasonRows = await safeQuery(() => getAllSeasons(), [] as Awaited<ReturnType<typeof getAllSeasons>>);
  const years: number[] = seasonRows.length > 0 ? seasonRows.map((s) => s.year) : [2025, 2026];

  const seasonPages: MetadataRoute.Sitemap = years.flatMap((year) => {
    const season = seasonRows.find((s) => s.year === year);
    const lastModified = season?.createdAt ?? undefined;
    return [
      entry(`/seo/${year}`, { changeFrequency: "monthly", priority: 0.8, lastModified }),
      entry(`/seo/${year}/central/final-standings`, { changeFrequency: "weekly", priority: 0.7, lastModified }),
      entry(`/seo/${year}/pacific/final-standings`, { changeFrequency: "weekly", priority: 0.7, lastModified }),
      entry(`/seo/${year}/title-leaders`, { changeFrequency: "weekly", priority: 0.7, lastModified }),
      entry(`/seo/${year}/central/title-leaders`, { changeFrequency: "weekly", priority: 0.6, lastModified }),
      entry(`/seo/${year}/pacific/title-leaders`, { changeFrequency: "weekly", priority: 0.6, lastModified }),
      entry(`/standings?year=${year}`, { changeFrequency: "daily", priority: 0.7, lastModified }),
      entry(`/predictions?year=${year}`, { changeFrequency: "weekly", priority: 0.6, lastModified }),
    ];
  });

  const teamPages: MetadataRoute.Sitemap = years.flatMap((year) =>
    NPB_TEAMS.map((team) =>
      entry(`/seo/${year}/teams/${team.slug}`, {
        changeFrequency: "weekly",
        priority: 0.6,
      })
    )
  );

  const archivePages: MetadataRoute.Sitemap = years.flatMap((year) => [
    entry(`/archive/${year}`, { changeFrequency: "monthly", priority: 0.6 }),
    entry(`/archive/${year}/predictions`, { changeFrequency: "monthly", priority: 0.5 }),
  ]);

  // Dynamic: users (public participants — any user who has at least one
  // prediction is considered public).
  type UserRow = { id: number; updatedAt?: Date };
  const userRows = await safeQuery<UserRow[]>(async () => {
    const db = getDb();
    // Use predictions.updatedAt as a freshness proxy since users lacks
    // an updated_at column.
    const rows = await db
      .select({
        id: users.id,
        updatedAt: predictions.updatedAt,
      })
      .from(users)
      .innerJoin(predictions, eq(users.id, predictions.userId))
      .orderBy(desc(predictions.updatedAt));
    // Deduplicate by user id (keep most recent update)
    const seen = new Set<number>();
    const deduped: UserRow[] = [];
    for (const r of rows) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      deduped.push({ id: r.id, updatedAt: r.updatedAt });
    }
    return deduped;
  }, []);

  const userPages: MetadataRoute.Sitemap = userRows.map((u) =>
    entry(`/users/${u.id}`, {
      changeFrequency: "weekly",
      priority: 0.5,
      ...(u.updatedAt ? { lastModified: u.updatedAt } : {}),
    })
  );

  // Add /users/:id?year=YYYY for each user × active year
  const userYearPages: MetadataRoute.Sitemap = userRows.flatMap((u) =>
    years.map((year) =>
      entry(`/users/${u.id}?year=${year}`, {
        changeFrequency: "weekly",
        priority: 0.4,
      })
    )
  );

  // Freshness from latest score snapshot (used for /standings lastModified)
  const latestScoreDate = await safeQuery<Date | undefined>(async () => {
    const db = getDb();
    const rows = await db
      .select({ snapshotDate: scoreSnapshots.snapshotDate })
      .from(scoreSnapshots)
      .orderBy(desc(scoreSnapshots.snapshotDate))
      .limit(1);
    return rows[0]?.snapshotDate;
  }, undefined);

  if (latestScoreDate) {
    // Refresh lastModified on standings entry
    const standings = staticPages.find((p) => p.url === `${BASE_URL}/standings`);
    if (standings) standings.lastModified = latestScoreDate;
  }

  return [
    ...staticPages,
    ...seasonPages,
    ...teamPages,
    ...archivePages,
    ...userPages,
    ...userYearPages,
  ];
}
