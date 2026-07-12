export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import {
  AFFILIATE_DISCLOSURE,
  getAffiliateResources,
  type AffiliateCategory,
} from "@/lib/affiliate-resources";
import { canonicalAlternates } from "@/lib/seo-meta";
import { AffiliateLink } from "./AffiliateLink";

export const metadata: Metadata = {
  title: "観戦・予想の道具箱",
  description:
    "プロ野球の順位予想をもっと楽しむための観戦メモ、野球本、配信・放送、応援グッズのリンク集です。",
  alternates: canonicalAlternates("/resources"),
  robots: { index: true, follow: true },
};

const CATEGORY_LABELS: Record<AffiliateCategory, string> = {
  study: "予想を深める",
  watch: "試合を追う",
  gear: "観戦を楽しむ",
};

export default function ResourcesPage() {
  const resources = getAffiliateResources();
  const monetizedCount = resources.filter((resource) => resource.monetized).length;

  return (
    <div className="space-y-6">
      <section
        className="overflow-hidden rounded-xl"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-primary)",
        }}
      >
        <div
          className="px-5 py-3"
          style={{
            background: "var(--field)",
            color: "#fff",
          }}
        >
          <p
            className="text-xs font-bold"
            style={{ letterSpacing: "0.16em" }}
          >
            RESOURCES
          </p>
        </div>
        <div className="px-6 py-8 sm:px-10">
          <p
            className="text-xs font-bold"
            style={{ color: "var(--stitch)", letterSpacing: "0.12em" }}
          >
            観戦・予想の道具箱
          </p>
          <h1
            className="mt-3 text-2xl font-black sm:text-3xl"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-display, var(--font-display-default))",
              letterSpacing: "0.04em",
            }}
          >
            予想をもっと楽しむリンク集
          </h1>
          <p
            className="mt-4 max-w-2xl text-sm leading-7"
            style={{ color: "var(--text-secondary)" }}
          >
            順位予想は、試合を追うほど面白くなります。メモ、読み物、視聴環境、観戦小物をここにまとめていきます。
          </p>
          <p
            className="mt-4 rounded-lg px-4 py-3 text-xs leading-6"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-primary)",
              color: "var(--text-muted)",
            }}
          >
            {AFFILIATE_DISCLOSURE}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {resources.map((resource) => (
          <article
            key={resource.id}
            className="rounded-xl p-5"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-primary)",
            }}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span
                className="rounded-full px-3 py-1 text-[11px] font-bold"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-primary)",
                  color: "var(--text-secondary)",
                }}
              >
                {CATEGORY_LABELS[resource.category]}
              </span>
              <span
                className="text-[11px] font-bold uppercase"
                style={{ color: "var(--text-muted)", letterSpacing: "0.08em" }}
              >
                {resource.provider}
              </span>
            </div>
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {resource.title}
            </h2>
            <p
              className="mt-2 min-h-[4.5rem] text-sm leading-6"
              style={{ color: "var(--text-secondary)" }}
            >
              {resource.description}
            </p>
            <div className="mt-5">
              <AffiliateLink resource={resource} />
            </div>
          </article>
        ))}
      </section>

      <section
        className="rounded-xl px-5 py-4 text-sm leading-7"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-primary)",
          color: "var(--text-secondary)",
        }}
      >
        <p className="font-bold" style={{ color: "var(--text-primary)" }}>
          今日の状態
        </p>
        <p className="mt-1">
          収益化済みリンク: {monetizedCount}件 / {resources.length}件。未設定の枠は通常リンクとして動き、アフィリエイトURLを環境変数に入れると同じ画面のまま収益リンクへ切り替わります。
        </p>
        <div className="mt-3">
          <Link
            href="/rankings/scoreboard"
            className="inline-flex min-h-10 items-center text-sm font-bold"
            style={{ color: "var(--stitch)" }}
          >
            最新のスコアボードへ戻る &#8594;
          </Link>
        </div>
      </section>
    </div>
  );
}
