/**
 * Share URL builder and OG image URL utilities for social sharing.
 */

export type OgType = "prediction" | "scoreboard" | "monthly-champion" | "weekly";

export interface OgParams {
  year?: number;
  userId?: number;
  month?: number;
  format?: "twitter" | "instagram" | "square";
}

/**
 * Get the app's base URL from env or fallback.
 */
function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_BASE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}

/**
 * Build the OG image URL for a given type and params.
 */
export function getOgImageUrl(type: OgType, params: OgParams = {}): string {
  const base = getBaseUrl();
  const searchParams = new URLSearchParams();

  if (params.year) searchParams.set("year", String(params.year));
  if (params.userId) searchParams.set("userId", String(params.userId));
  if (params.month) searchParams.set("month", String(params.month));
  if (params.format) searchParams.set("format", params.format);

  const qs = searchParams.toString();
  return `${base}/api/og/${type}${qs ? `?${qs}` : ""}`;
}

/**
 * Build the page URL for sharing.
 */
export function getShareUrl(
  type: OgType,
  params: OgParams = {}
): string {
  const base = getBaseUrl();
  const year = params.year ?? new Date().getFullYear();

  switch (type) {
    case "prediction":
      return `${base}/users/${params.userId}?year=${year}`;
    case "scoreboard":
      return `${base}/standings?year=${year}`;
    case "monthly-champion":
      return `${base}/standings?year=${year}`;
    case "weekly":
      return `${base}/standings?year=${year}`;
    default:
      return base;
  }
}

/**
 * Generate share text for X/Twitter posts.
 */
export function getShareText(
  type: OgType,
  params: OgParams & { userName?: string } = {}
): string {
  const year = params.year ?? new Date().getFullYear();

  switch (type) {
    case "prediction":
      return params.userName
        ? `${params.userName}の${year}年プロ野球順位予想を公開! #NPB予想リーグ`
        : `${year}年プロ野球順位予想を公開! #NPB予想リーグ`;
    case "scoreboard":
      return `${year}年NPB予想リーグ 現在のスコアボード! #NPB予想リーグ`;
    case "monthly-champion":
      return `${year}年NPB予想リーグ 月間チャンピオン発表! #NPB予想リーグ`;
    case "weekly":
      return `${year}年NPB予想リーグ 今週のスコア変動! #NPB予想リーグ`;
    default:
      return `NPB予想リーグ #NPB予想リーグ`;
  }
}

/**
 * Build a full X/Twitter share intent URL.
 */
export function getTwitterShareUrl(
  type: OgType,
  params: OgParams & { userName?: string } = {}
): string {
  const text = getShareText(type, params);
  const url = getShareUrl(type, params);
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

/**
 * Build a LINE share URL.
 */
export function getLineShareUrl(
  type: OgType,
  params: OgParams = {}
): string {
  const url = getShareUrl(type, params);
  return `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;
}
