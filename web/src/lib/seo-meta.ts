/**
 * Shared SEO metadata helpers.
 *
 * Centralizes site URL resolution, canonical construction, and Japanese
 * SEO vocabulary for NPB予想リーグ.
 */

import type { Metadata } from "next";

/**
 * Resolve the public site URL.
 *
 * Prefers NEXT_PUBLIC_SITE_URL, falls back to NEXT_PUBLIC_BASE_URL, then a
 * Cloudflare Pages default. Keep this consistent with robots/sitemap.
 */
export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    "https://npb-predictions.pages.dev"
  );
}

/**
 * Build an absolute URL for a pathname (or return origin for "/").
 */
export function absoluteUrl(pathname: string): string {
  const base = getSiteUrl();
  try {
    return new URL(pathname, base).toString();
  } catch {
    return `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
  }
}

/**
 * Build a Metadata.alternates block with canonical + ja-JP language.
 */
export function canonicalAlternates(pathname: string): Metadata["alternates"] {
  const url = absoluteUrl(pathname);
  return {
    canonical: url,
    languages: {
      "ja-JP": url,
    },
  };
}

/**
 * Build the full OG image URL (absolute) for social previews.
 */
export function ogImageUrl(
  type:
    | "prediction"
    | "scoreboard"
    | "monthly-champion"
    | "weekly"
    | "season"
    | "team",
  params: Record<string, string | number | undefined> = {}
): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const query = qs.toString();
  return absoluteUrl(`/api/og/${type}${query ? `?${query}` : ""}`);
}

/**
 * Compose OpenGraph + Twitter blocks using a pre-built OG image URL.
 */
export function socialPreview(opts: {
  title: string;
  description: string;
  pathname: string;
  ogImage?: string;
}): Pick<Metadata, "openGraph" | "twitter"> {
  const url = absoluteUrl(opts.pathname);
  const images = opts.ogImage
    ? [{ url: opts.ogImage, width: 1200, height: 630, alt: opts.title }]
    : undefined;
  return {
    openGraph: {
      type: "website",
      locale: "ja_JP",
      siteName: "NPB予想リーグ",
      url,
      title: opts.title,
      description: opts.description,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      ...(opts.ogImage ? { images: [opts.ogImage] } : {}),
    },
  };
}

/**
 * Japanese SEO vocabulary used consistently across pages.
 * Keep natural, avoid keyword stuffing.
 */
export const SEO_TERMS = {
  site: "NPB予想リーグ",
  tagline: "プロ野球順位予想リーグ",
  central: "セ・リーグ",
  pacific: "パ・リーグ",
  bothLeagues: "セ・パ両リーグ",
  npbShort: "プロ野球",
  npbFull: "日本プロ野球（NPB）",
} as const;

/**
 * Clamp a description to a safe length for search snippets (80-120 chars).
 */
export function clampDescription(text: string, max = 120): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}
