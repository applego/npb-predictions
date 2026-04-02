import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://npb-predictions.vercel.app";

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
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <Link href="/" className="mr-auto text-lg font-bold shrink-0">
              NPB⚾
            </Link>
            <div className="flex items-center gap-3 text-sm overflow-x-auto">
              <Link href="/" className="whitespace-nowrap hover:underline">Home</Link>
              <Link href="/standings" className="whitespace-nowrap hover:underline">Standings</Link>
              <Link href="/predictions" className="whitespace-nowrap hover:underline">Predictions</Link>
              <Link href="/seo/past-seasons" className="whitespace-nowrap hover:underline">Archive</Link>
              <Link href="/admin" className="whitespace-nowrap hover:underline text-orange-600">Admin</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
