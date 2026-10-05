import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Noto_Sans_JP, Oswald } from "next/font/google";
import { Providers } from "@/components/Providers";
import { AuthHeader } from "@/components/AuthHeader";
import { Nav } from "@/components/Nav";
import { ThemeLoader } from "@/components/ThemeLoader";
import { WebsiteJsonLd } from "@/components/StructuredData";
import { absoluteUrl, canonicalAlternates, clampDescription, getSiteUrl, SEO_TERMS } from "@/lib/seo-meta";
import "./globals.css";
import "./results.css";
import "./readability.css";

const oswald = Oswald({ weight: ["400", "500", "700"], subsets: ["latin"], variable: "--font-display-default", display: "swap", preload: false, fallback: ["Arial Narrow", "system-ui", "sans-serif"] });
const notoSansJp = Noto_Sans_JP({ weight: ["400", "500", "700"], subsets: ["latin"], variable: "--font-body-ja", display: "swap", preload: false, fallback: ["Hiragino Sans", "Yu Gothic", "system-ui", "sans-serif"] });
const ROOT_DESCRIPTION = clampDescription("プロ野球の順位予想を出典つきで答え合わせ。解説者・評論家の予想と実順位、セ・パ両リーグの的中状況、過去の成績を比較できます。");
export const metadata: Metadata = {
  title: { default: `${SEO_TERMS.site} | 順位予想の答え合わせ`, template: `%s | ${SEO_TERMS.site}` },
  description: ROOT_DESCRIPTION, metadataBase: new URL(getSiteUrl()), applicationName: SEO_TERMS.site,
  keywords: [SEO_TERMS.site, SEO_TERMS.npbFull, SEO_TERMS.central, SEO_TERMS.pacific, "順位予想", "答え合わせ", "解説者", "予想的中", "ランキング"],
  alternates: canonicalAlternates("/"),
  openGraph: { type: "website", locale: "ja_JP", siteName: SEO_TERMS.site, url: absoluteUrl("/"), title: `${SEO_TERMS.site} | 順位予想の答え合わせ`, description: ROOT_DESCRIPTION },
  twitter: { card: "summary_large_image", title: `${SEO_TERMS.site} | 順位予想の答え合わせ`, description: ROOT_DESCRIPTION },
  robots: { index: true, follow: true }, formatDetection: { telephone: false, email: false, address: false },
  appleWebApp: { capable: true, title: SEO_TERMS.site, statusBarStyle: "black-translucent" }, category: "sports",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: [{ media: "(prefers-color-scheme: light)", color: "#FAF9F5" }, { media: "(prefers-color-scheme: dark)", color: "#0f172a" }], colorScheme: "light dark" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ja" className={`${oswald.variable} ${notoSansJp.variable}`}><body className="site-body antialiased" style={{ background: "var(--bg-base)", color: "var(--text-primary)", fontFamily: "var(--font-body, var(--font-body-default))" }}>
    <ThemeLoader /><WebsiteJsonLd />
    <a className="site-skip" href="#main-content">本文へスキップ</a>
    <Providers>
      <header className="site-header"><div className="site-header-inner"><Link className="site-brand" href="/" aria-label="NPB予想リーグ トップ"><span className="site-brand-mark" aria-hidden="true">N</span><span>NPB <b>予想リーグ</b><small>予想を、記録に。</small></span></Link><Nav /><div className="site-account"><AuthHeader /></div></div></header>
      <main id="main-content" tabIndex={-1} className="site-main">{children}</main>
      <footer className="site-footer"><div><Link href="/" className="site-footer-brand">NPB 予想リーグ</Link><p>春の予想も、秋の結果も。<br />予想の面白さを、出典と記録から。</p></div><nav aria-label="フッターナビゲーション"><Link href="/rankings">答え合わせ一覧</Link><Link href="/rankings/predictions">順位予想一覧</Link><Link href="/rankings/scoreboard">ポイント制成績</Link><Link href="/rankings/all-time">通算成績</Link><Link href="/predictions/new">予想をつくる</Link><Link href="/groups">グループ</Link><Link href="/settings">表示設定</Link></nav><p className="site-footer-note">当サイトはNPBの公式サイトではありません。順位・出典・更新時点を確認してお楽しみください。</p></footer>
    </Providers>
  </body></html>;
}
