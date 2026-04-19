import type { Metadata } from "next";
import {
  canonicalAlternates,
  clampDescription,
  socialPreview,
} from "@/lib/seo-meta";

const TITLE = "順位予想を登録 — NPB予想リーグ";
const DESCRIPTION = clampDescription(
  "今シーズンのセ・リーグ／パ・リーグ順位予想と各タイトル（首位打者・本塁打王・最多勝など）予想を登録。プロ野球の年間王者予想に参加しましょう。"
);
const PATHNAME = "/predictions/new";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...socialPreview({
    title: TITLE,
    description: DESCRIPTION,
    pathname: PATHNAME,
  }),
  alternates: canonicalAlternates(PATHNAME),
  robots: { index: true, follow: true },
};

export default function PredictionsNewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
