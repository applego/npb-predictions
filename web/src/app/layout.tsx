import type { Metadata } from "next";
import Link from "next/link";
import { Bebas_Neue, Noto_Sans_JP } from "next/font/google";
import { Providers } from "@/components/Providers";
import { AuthHeader } from "@/components/AuthHeader";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://npb-predictions.pages.dev";

export const metadata: Metadata = {
  title: {
    default: "NPB Predictions League | プロ野球順位予想リーグ",
    template: "%s | NPB Predictions League",
  },
  description:
    "プロ野球順位予想リーグ - 5人の予想を比較して年間王者を決めよう。セ・パ両リーグの順位予想とタイトル予想で競おう。",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "NPB Predictions League",
    title: "NPB Predictions League | プロ野球順位予想リーグ",
    description:
      "プロ野球順位予想リーグ - 5人の予想を比較して年間王者を決めよう。",
  },
  twitter: {
    card: "summary_large_image",
    title: "NPB Predictions League",
    description:
      "プロ野球順位予想リーグ - 5人の予想を比較して年間王者を決めよう。",
  },
  robots: { index: true, follow: true },
};

const NAV_LINKS = [
  { href: "/", label: "HOME" },
  { href: "/standings", label: "STANDINGS" },
  { href: "/predictions", label: "PREDICTIONS" },
  { href: "/rankings/commentators", label: "RANKINGS" },
  { href: "/seo/past-seasons", label: "ARCHIVE" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ja"
      className={`${bebasNeue.variable} ${notoSansJP.variable}`}
    >
      <body
        className="min-h-screen antialiased"
        style={{
          background: "#040912",
          color: "rgba(255,255,255,0.87)",
          fontFamily: "var(--font-body, 'Noto Sans JP', sans-serif)",
        }}
      >
        <Providers>
          {/* Grain texture overlay */}
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-50 opacity-[0.035]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              mixBlendMode: "overlay",
            }}
          />

          {/* ── Header ── */}
          <header
            className="sticky top-0 z-40 backdrop-blur-md"
            style={{
              background: "rgba(4, 9, 18, 0.88)",
              borderBottom: "1px solid rgba(251, 191, 36, 0.08)",
            }}
          >
            <nav className="mx-auto flex max-w-5xl items-center gap-x-6 gap-y-2 px-4 py-3">
              {/* Logo */}
              <Link
                href="/"
                className="group mr-auto flex shrink-0 items-center gap-2.5"
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded text-sm"
                  style={{
                    background: "rgba(251,191,36,0.08)",
                    border: "1px solid rgba(251,191,36,0.2)",
                  }}
                >
                  ⚾
                </span>
                <span
                  className="font-display text-2xl tracking-widest transition-colors"
                  style={{
                    color: "#fbbf24",
                    fontFamily:
                      "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                    letterSpacing: "0.18em",
                  }}
                >
                  NPB LEAGUE
                </span>
              </Link>

              {/* Nav links */}
              <div className="flex items-center gap-5 overflow-x-auto">
                {NAV_LINKS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="whitespace-nowrap text-xs font-medium tracking-widest transition-colors hover:text-amber-400"
                    style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em" }}
                  >
                    {label}
                  </Link>
                ))}
                <Link
                  href="/admin"
                  className="whitespace-nowrap text-xs font-medium tracking-widest transition-colors hover:text-orange-400"
                  style={{ color: "rgba(251,146,60,0.5)", letterSpacing: "0.15em" }}
                >
                  ADMIN
                </Link>
              </div>

              {/* Auth button */}
              <AuthHeader />
            </nav>

            {/* Amber accent line */}
            <div
              style={{
                height: "1px",
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.35) 40%, rgba(251,191,36,0.35) 60%, transparent 100%)",
              }}
            />
          </header>

          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>

          {/* ── Footer ── */}
          <footer
            className="mt-16 py-6"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="mx-auto max-w-5xl px-4 text-center">
              <span
                className="font-display text-xs tracking-widest"
                style={{
                  color: "rgba(255,255,255,0.15)",
                  fontFamily:
                    "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
                  letterSpacing: "0.2em",
                }}
              >
                NPB PREDICTIONS LEAGUE — プロ野球順位予想リーグ
              </span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
