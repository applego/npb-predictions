"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/rankings/predictions", label: "PREDICTIONS", match: "/rankings/predictions" },
  { href: "/rankings/commentators", label: "YEARLY", match: "/rankings/commentators" },
  { href: "/rankings/all-time", label: "ALL-TIME", match: "/rankings/all-time" },
  { href: "/rankings/scoreboard", label: "SCOREBOARD", match: "/rankings/scoreboard" },
];

export default function RankingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <div className="flex gap-0">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.match);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="px-4 py-2 text-xs font-bold transition-all"
              style={{
                fontFamily: "var(--font-display)",
                letterSpacing: "0.1em",
                color: active ? "var(--stitch)" : "var(--text-muted)",
                borderBottom: active ? "2px solid var(--stitch)" : "2px solid var(--border-primary)",
                background: active ? "rgba(229,57,53,0.04)" : "transparent",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
        <div className="flex-1" style={{ borderBottom: "2px solid var(--border-primary)" }} />
      </div>
      {children}
    </div>
  );
}
