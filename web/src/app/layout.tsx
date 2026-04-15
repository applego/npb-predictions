import type { Metadata } from "next";
import Link from "next/link";
import { Bebas_Neue, Noto_Sans_JP } from "next/font/google";
import { Providers } from "@/components/Providers";
import { AuthHeader } from "@/components/AuthHeader";
import { Nav } from "@/components/Nav";
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
    "プロ野球順位予想リーグ - 順位予想を比較して年間王者を決めよう。",
  metadataBase: new URL(BASE_URL),
  openGraph: { type: "website", locale: "ja_JP", siteName: "NPB Predictions League" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${bebasNeue.variable} ${notoSansJP.variable}`}>
      <body
        className="min-h-screen antialiased"
        style={{
          background: "var(--bg-base)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-body)",
        }}
      >
        <Providers>
          {/* ── Header: white bar + red stitch ── */}
          <header
            className="sticky top-0 z-40"
            style={{
              background: "var(--bg-surface)",
              borderBottom: "1px solid var(--border-primary)",
            }}
          >
            <nav className="relative mx-auto flex max-w-[72rem] items-center gap-x-4 px-4 py-3 md:px-6">
              {/* Logo: red home-plate N */}
              <Link href="/" className="mr-auto flex shrink-0 items-center gap-2.5">
                <span
                  className="home-plate flex h-8 w-8 items-center justify-center text-sm font-black"
                  style={{ background: "var(--stitch)", color: "#fff" }}
                >
                  N
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.25rem",
                    letterSpacing: "0.1em",
                    color: "var(--text-primary)",
                  }}
                >
                  NPB{" "}
                  <span style={{ color: "var(--stitch)" }}>LEAGUE</span>
                </span>
              </Link>

              <Nav />
              <AuthHeader />
            </nav>

            {/* Red stitch line — baseball seam */}
            <div className="stitch-border" />
          </header>

          <main className="mx-auto max-w-[72rem] px-4 py-8 md:px-6">
            {children}
          </main>

          {/* ── Footer ── */}
          <footer className="mt-12 pb-6">
            <div className="bat-divider mx-auto max-w-[72rem]" />
            <div className="pt-4 text-center">
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "0.65rem",
                  letterSpacing: "0.2em",
                  color: "var(--text-muted)",
                }}
              >
                NPB PREDICTIONS LEAGUE
              </span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
