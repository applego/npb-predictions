import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Bebas_Neue, Noto_Sans_JP } from "next/font/google";
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
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  "https://npb-predictions.pages.dev";

const DEFAULT_TITLE = "NPB予想リーグ — プロ野球順位予想リーグ";
const DEFAULT_DESCRIPTION =
  "プロ野球順位予想リーグ。セ・リーグとパ・リーグの順位予想とタイトル予想を比較し、NPB予想の的中率や得点をスコアボードで追跡できます。";

export const metadata: Metadata = {
  title: {
    default: DEFAULT_TITLE,
    template: "%s | NPB予想リーグ",
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    "プロ野球順位予想",
    "NPB予想",
    "NPB予想リーグ",
    "セ・リーグ順位予想",
    "パ・リーグ順位予想",
    "プロ野球タイトル予想",
    "首位打者",
    "本塁打王",
    "最多勝",
  ],
  metadataBase: new URL(BASE_URL),
  alternates: {
    canonical: "/",
    languages: {
      "ja-JP": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "NPB予想リーグ",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    title: "NPB予想リーグ",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#040912",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

const NAV_LINKS = [
  { href: "/", label: "HOME" },
  { href: "/standings", label: "STANDINGS" },
  { href: "/predictions", label: "PREDICTIONS" },
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
      </body>
    </html>
  );
}
