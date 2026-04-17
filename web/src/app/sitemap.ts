export const runtime = "edge";

import type { MetadataRoute } from "next";
import { getAllSeasons } from "@/lib/seo-queries";
import { NPB_TEAMS } from "@/lib/teams";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://npb-predictions.pages.dev";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // DB may be unavailable at build time — fall back to static years
  let years: number[] = [2025, 2026];
  try {
    const seasons = await getAllSeasons();
    if (seasons.length > 0) years = seasons.map((s) => s.year);
  } catch {
    // DB not configured yet — use default years
  }

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/standings`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/predictions`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/news`, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/seo/past-seasons`, changeFrequency: "yearly", priority: 0.7 },
  ];

  const seasonPages: MetadataRoute.Sitemap = years.flatMap((year) => [
    { url: `${BASE_URL}/seo/${year}`, changeFrequency: "yearly" as const, priority: 0.8 },
    { url: `${BASE_URL}/seo/${year}/central/final-standings`, changeFrequency: "yearly" as const, priority: 0.7 },
    { url: `${BASE_URL}/seo/${year}/pacific/final-standings`, changeFrequency: "yearly" as const, priority: 0.7 },
    { url: `${BASE_URL}/seo/${year}/title-leaders`, changeFrequency: "yearly" as const, priority: 0.7 },
    { url: `${BASE_URL}/seo/${year}/central/title-leaders`, changeFrequency: "yearly" as const, priority: 0.6 },
    { url: `${BASE_URL}/seo/${year}/pacific/title-leaders`, changeFrequency: "yearly" as const, priority: 0.6 },
  ]);

  const teamPages: MetadataRoute.Sitemap = years.flatMap((year) =>
    NPB_TEAMS.map((team) => ({
      url: `${BASE_URL}/seo/${year}/teams/${team.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    }))
  );

  const archivePages: MetadataRoute.Sitemap = years.flatMap((year) => [
    {
      url: `${BASE_URL}/archive/${year}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/archive/${year}/predictions`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
  ]);

  return [...staticPages, ...seasonPages, ...teamPages, ...archivePages];
}
