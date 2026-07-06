import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Bebas_Neue, Noto_Sans_JP } from "next/font/google";
import { Providers } from "@/components/Providers";
import { AuthHeader } from "@/components/AuthHeader";
import { Nav } from "@/components/Nav";
import { ThemeLoader } from "@/components/ThemeLoader";
import { WebsiteJsonLd } from "@/components/StructuredData";
import {
  absoluteUrl,
  canonicalAlternates,
  clampDescription,
  getSiteUrl,
  SEO_TERMS,
} from "@/lib/seo-meta";
import "./globals.css";

// Default fonts (fallback when settings haven't loaded yet)
// preload: false + explicit fallback shrinks dev-mode google fonts retries
// (Next.js retries every weight/subset on each restart — harmless in prod
//  thanks to build-time prefetch, but ~37 retries during dev startup).
const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display-default",
  display: "swap",
  preload: false,
  fallback: ["Impact", "system-ui", "sans-serif"],
});

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-body-default",
  display: "swap",
  preload: false,
  fallback: ["Hiragino Sans", "Hiragino Kaku Gothic ProN", "system-ui", "sans-serif"],
});

const ROOT_DESCRIPTION = clampDescription(
  `${SEO_TERMS.npbFull}の${SEO_TERMS.bothLeagues}順位予想を投稿・比較できる${SEO_TERMS.tagline}。解説者・評論家の的中率と年度ランキングを可視化します。`,
);

export const metadata: Metadata = {
  title: {
    default: `${SEO_TERMS.site} | ${SEO_TERMS.tagline}`,
    template: `%s | ${SEO_TERMS.site}`,
  },
  description: ROOT_DESCRIPTION,
  metadataBase: new URL(getSiteUrl()),
  applicationName: SEO_TERMS.site,
  keywords: [
    SEO_TERMS.site,
    SEO_TERMS.tagline,
    SEO_TERMS.npbFull,
    SEO_TERMS.npbShort,
    SEO_TERMS.central,
    SEO_TERMS.pacific,
    SEO_TERMS.bothLeagues,
    "順位予想",
    "的中率",
    "解説者 予想",
    "プロ野球 スコアボード",
  ],
  alternates: canonicalAlternates("/"),
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: SEO_TERMS.site,
    url: absoluteUrl("/"),
    title: `${SEO_TERMS.site} | ${SEO_TERMS.tagline}`,
    description: ROOT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SEO_TERMS.site} | ${SEO_TERMS.tagline}`,
    description: ROOT_DESCRIPTION,
  },
  robots: { index: true, follow: true },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  appleWebApp: {
    capable: true,
    title: SEO_TERMS.site,
    statusBarStyle: "black-translucent",
  },
  category: "sports",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${bebasNeue.variable} ${notoSansJP.variable}`}>
      <body
        className="min-h-screen antialiased"
        style={{
          background: "var(--bg-base)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-body, var(--font-body-default))",
        }}
      >
        {/* Client component that loads settings and injects CSS variables */}
        <ThemeLoader />

        <WebsiteJsonLd />

        <Providers>
          <header
            className="sticky top-0 z-40"
            style={{
              background: "var(--bg-surface)",
              borderBottom: "1px solid var(--border-primary)",
            }}
          >
            <nav className="relative mx-auto flex max-w-[72rem] items-center gap-x-3 px-3 py-2.5 sm:gap-x-4 sm:px-4 md:px-6">
              <Link href="/" className="mr-auto flex min-h-11 shrink-0 items-center gap-2.5">
                <span
                  className="home-plate flex h-8 w-8 items-center justify-center text-sm font-black"
                  style={{ background: "var(--field)", color: "#fff" }}
                >
                  N
                </span>
                <span
                  className="hidden sm:inline"
                  style={{
                    fontFamily: "var(--font-display, var(--font-display-default))",
                    fontSize: "1.25rem",
                    letterSpacing: "0.1em",
                    color: "var(--text-primary)",
                  }}
                >
                  NPB <span style={{ color: "var(--field)" }}>PREDICTIONS</span>
                </span>
                <span
                  className="inline sm:hidden"
                  style={{
                    fontFamily: "var(--font-display, var(--font-display-default))",
                    fontSize: "1.25rem",
                    letterSpacing: "0.1em",
                    color: "var(--text-primary)",
                  }}
                >
                  NPB
                </span>
              </Link>
              <Nav />
              <AuthHeader />
            </nav>
            <div className="stitch-border" />
          </header>

          <main className="mx-auto max-w-[72rem] px-4 py-8 md:px-6">
            {children}
          </main>

          <footer className="mt-12 pb-6">
            <div className="bat-divider mx-auto max-w-[72rem]" />
            <div className="pt-4 text-center">
              <span
                style={{
                  fontFamily: "var(--font-display, var(--font-display-default))",
                  fontSize: "0.65rem",
                  letterSpacing: "0.2em",
                  color: "var(--text-muted)",
                }}
              >
                NPB PREDICTIONS
              </span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
