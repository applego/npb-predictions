import type { Metadata } from "next";
import { canonicalAlternates } from "@/lib/seo-meta";

export const metadata: Metadata = {
  title: "マイページ",
  description: "自分の予想履歴・スコア推移・参加グループを確認するプライベートページ。",
  robots: { index: false, follow: false },
  alternates: canonicalAlternates("/me"),
};

export default function MeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
