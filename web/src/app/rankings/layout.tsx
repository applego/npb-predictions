import type { Metadata } from "next";

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
  return <>{children}</>;
}
