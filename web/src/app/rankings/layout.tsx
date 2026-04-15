"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RankChangeNotifier } from "@/components/RankChangeNotifier";

const TABS = [
  {
    href: "/rankings/predictions",
    icon: "\u{1F52E}",
    label: "\u4E88\u60F3",
    matches: ["/rankings/predictions"],
  },
  {
    href: "/rankings/live",
    icon: "\u{1F4C8}",
    label: "\u30E9\u30A4\u30D6",
    matches: ["/rankings/live"],
  },
  {
    href: "/rankings/scoreboard",
    icon: "\u{1F3C6}",
    label: "\u7D50\u679C",
    matches: ["/rankings/scoreboard"],
  },
  {
    href: "/rankings/all-time",
    icon: "\u{1F4CA}",
    label: "\u6BBF\u5802",
    matches: ["/rankings/all-time", "/rankings/commentators"],
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
              className="flex items-center gap-1.5 px-3 py-2.5 transition-all sm:px-4"
              style={{
                borderBottom: active
                  ? "2px solid var(--stitch)"
                  : "2px solid var(--border-primary)",
                background: active ? "rgba(229,57,53,0.04)" : "transparent",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  lineHeight: 1,
                }}
              >
                {tab.icon}
              </span>
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
            </Link>
          );
        })}
        <div className="flex-1" style={{ borderBottom: "2px solid var(--border-primary)" }} />
      </div>
      {children}
      <RankChangeNotifier />
    </div>
  );
}
