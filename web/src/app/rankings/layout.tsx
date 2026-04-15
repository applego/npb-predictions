import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    template: "%s | NPB Predictions League",
    default: "ランキング | NPB Predictions League",
  },
};

export default function RankingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      {/* Rankings sub-nav */}
      <div className="flex items-center gap-1.5">
        <Link
          href="/rankings/commentators"
          className="rounded-sm px-3 py-1.5 text-xs font-medium transition-all"
          style={{
            fontFamily: "var(--font-display)",
            letterSpacing: "0.1em",
            border: "1px solid var(--border-primary)",
            color: "var(--text-secondary)",
          }}
        >
          YEARLY
        </Link>
        <Link
          href="/rankings/all-time"
          className="rounded-sm px-3 py-1.5 text-xs font-medium transition-all"
          style={{
            fontFamily: "var(--font-display)",
            letterSpacing: "0.1em",
            border: "1px solid var(--border-primary)",
            color: "var(--text-secondary)",
          }}
        >
          ALL-TIME
        </Link>
      </div>
      {children}
    </div>
  );
}
