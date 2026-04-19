import type { Metadata } from "next";
import {
  canonicalAlternates,
  clampDescription,
  ogImageUrl,
  socialPreview,
  SEO_TERMS,
} from "@/lib/seo-meta";

const TITLE = "予想を登録する";
const DESCRIPTION = clampDescription(
  `${SEO_TERMS.npbFull}の${SEO_TERMS.bothLeagues}順位予想とタイトル予想を登録できます。${SEO_TERMS.site}に参加して年間の的中スコアを競いましょう。`,
);

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    SEO_TERMS.site,
    `${SEO_TERMS.npbShort} 順位予想 登録`,
    `${SEO_TERMS.central} 予想`,
    `${SEO_TERMS.pacific} 予想`,
    "タイトル予想",
  ],
  robots: { index: false, follow: true },
  alternates: canonicalAlternates("/predictions/new"),
  ...socialPreview({
    title: `${TITLE} | ${SEO_TERMS.site}`,
    description: DESCRIPTION,
    pathname: "/predictions/new",
    ogImage: ogImageUrl("season", {}),
  }),
};

export default function NewPredictionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
