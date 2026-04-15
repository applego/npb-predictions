"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/rankings/predictions",
    label: "予想",
    sub: "PREDICTIONS",
    matches: ["/rankings/predictions"],
  },
  {
    href: "/rankings/commentators",
    label: "解説者",
    sub: "COMMENTATORS",
    matches: ["/rankings/commentators", "/rankings/all-time"],
  },
  {
    href: "/rankings/scoreboard",
    label: "スコア",
    sub: "SCOREBOARD",
    matches: ["/rankings/scoreboard"],
  },
];

export default function RankingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <div className="flex gap-0">
        {TABS.map((tab) => {
          const active = tab.matches.some((m) => pathname.startsWith(m));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center px-4 py-2 transition-all"
              style={{
                borderBottom: active
                  ? "2px solid var(--stitch)"
                  : "2px solid var(--border-primary)",
                background: active ? "rgba(229,57,53,0.04)" : "transparent",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.06em",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: active ? "var(--stitch)" : "var(--text-secondary)",
                  lineHeight: 1.2,
                }}
              >
                {tab.label}
              </span>
              <span
                style={{
                  fontSize: "8px",
                  letterSpacing: "0.14em",
                  color: active ? "rgba(229,57,53,0.55)" : "var(--text-muted)",
                  lineHeight: 1.4,
                }}
              >
                {tab.sub}
              </span>
            </Link>
          );
        })}
        <div className="flex-1" style={{ borderBottom: "2px solid var(--border-primary)" }} />
      </div>
      {children}
    </div>
  );
}
