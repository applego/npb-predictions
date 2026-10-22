import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import PredictionsPage from "@/app/rankings/predictions/page";
import AllTimeRankingsPage from "@/app/rankings/all-time/page";
import { AllTimeTable } from "@/app/rankings/all-time/AllTimeClient";

vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "preview.example", "x-forwarded-proto": "https" }) }));
// The server-rendering invariant is independent of badge artwork and share hydration.
vi.mock("@/components/TeamBadge", () => ({ TeamBadge: ({ teamName }: { teamName: string }) => React.createElement("span", null, teamName) }));
vi.mock("@/components/ShareButton", () => ({ default: () => null }));

afterEach(() => { vi.unstubAllGlobals(); });

const predictions = Array.from({ length: 337 }, (_, index) => ({
  id: index + 1, user: { id: index + 1, name: `検証予想者${String(index + 1).padStart(3, "0")}`, role: index % 2 ? "friend" : "commentator", source: null },
  rankingPicks: Array.from({ length: 12 }, (_, pick) => ({ league: pick < 6 ? "central" : "pacific", rank: pick % 6 + 1, teamName: `球団${pick}` })),
}));
function matrixFetch() {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url === "https://preview.example/api/seasons/2026/predictions") return Response.json(predictions);
    if (url === "https://preview.example/api/seasons") return Response.json([{ year: 2026, isActive: true }]);
    throw new Error(`Unexpected request: ${url}`);
  }));
}

it("bounds the initial matrix to 20 complete predictions, keeping later records reachable", async () => {
  matrixFetch();
  const first = renderToStaticMarkup(await PredictionsPage({ searchParams: Promise.resolve({ year: "2026" }) }));
  expect((first.match(/検証予想者\d{3}/g) ?? []).length).toBe(20);
  expect(first).toContain("検証予想者001"); expect(first).not.toContain("検証予想者021");
  expect(first).toContain("次へ");
  const last = renderToStaticMarkup(await PredictionsPage({ searchParams: Promise.resolve({ year: "2026", page: "17" }) }));
  expect((last.match(/検証予想者\d{3}/g) ?? []).length).toBe(17);
  expect(last).toContain("検証予想者337"); expect(last).toContain("前へ");
});

it("searches the entire matrix before pagination, including records outside the first page", async () => {
  matrixFetch();
  const html = renderToStaticMarkup(await PredictionsPage({ searchParams: Promise.resolve({ year: "2026", q: "検証予想者337", page: "999" }) }));
  expect(html).toContain("検証予想者337"); expect(html).not.toContain("検証予想者001");
  expect(html).toContain("1 / 1ページ");
});

const commentators = Array.from({ length: 794 }, (_, index) => ({
  rank: index + 1, userId: index + 1, name: `通算検証者${String(index + 1).padStart(3, "0")}`, slug: `fixture-${index + 1}`, source: null,
  yearsCount: 1, allTimeCentral: 12, allTimePacific: 12, allTimeTotal: 794 - index, avgPerYear: 24, bestScore: 24, bestYear: 2026, avgDeviation: 50,
}));
it("server-renders only the first 20 all-time rows even with 794 commentators", () => {
  const html = renderToStaticMarkup(React.createElement(AllTimeTable, { commentators }));
  expect((html.match(/href="\/commentators\/fixture-/g) ?? []).length).toBe(20);
  expect(html).toContain("通算検証者020"); expect(html).not.toContain("通算検証者021");
  expect(html).toContain("794件");
});

it("fetches all-time data from the requested preview origin rather than production", async () => {
  const fetcher = vi.fn(async () => Response.json({ totalCommentators: 0, availableYears: [], commentators: [] }));
  vi.stubGlobal("fetch", fetcher);
  await AllTimeRankingsPage();
  expect(fetcher).toHaveBeenCalledWith("https://preview.example/api/rankings/all-time", { cache: "no-store" });
});

it("normalizes repeated search parameters without throwing or losing the requested result", async () => {
  matrixFetch();
  const html = renderToStaticMarkup(await PredictionsPage({ searchParams: Promise.resolve({ year: ["2026", "2025"], q: ["検証予想者337", "other"], page: ["1", "2"] }) }));
  expect(html).toContain("検証予想者337"); expect(html).toContain("1 / 1ページ");
});

it("distinguishes a failed prediction API from a genuinely empty season", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("/predictions") ? new Response("Unavailable", { status: 503 }) : Response.json([{ year: 2026 }])));
  const html = renderToStaticMarkup(await PredictionsPage({ searchParams: Promise.resolve({ year: "2026" }) }));
  expect(html).toContain('role="alert"'); expect(html).toContain("取得に失敗しました");
  expect(html).not.toContain("予想一覧のページ"); expect(html).not.toContain("予想データはありません");
});
