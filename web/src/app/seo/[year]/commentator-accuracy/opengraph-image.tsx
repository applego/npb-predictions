import { ImageResponse } from "next/og";
import { getTopCommentatorsForYear } from "@/lib/commentator-queries";

export const runtime = "edge";
export const alt = "NPB Predictions 解説者的中率ランキング";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ year: string }> };

export default async function Image({ params }: Props) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);

  // Get top 5 commentators for this year
  const commentators = await getTopCommentatorsForYear(
    Number.isNaN(year) ? new Date().getFullYear() : year,
    5
  );

  const rankColors = ["#fbbf24", "#c0c0c0", "#cd7f32", "#94a3b8", "#94a3b8"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#1a1a2e",
          color: "white",
          fontFamily: "sans-serif",
          padding: "40px 60px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", fontSize: 16, color: "#94a3b8", marginBottom: "8px" }}>
            NPB Predictions League
          </div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800 }}>
            {year}年 解説者ランキング
          </div>
        </div>

        {/* Ranking rows */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            gap: "8px",
          }}
        >
          {commentators.length === 0 ? (
            <div
              style={{
                display: "flex",
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                color: "#94a3b8",
              }}
            >
              データがありません
            </div>
          ) : (
            commentators.map((c, idx) => (
              <div
                key={c.slug}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 20px",
                  backgroundColor:
                    idx === 0 ? "#2D5A27" : "rgba(255,255,255,0.05)",
                  borderRadius: "12px",
                  gap: "16px",
                }}
              >
                {/* Rank */}
                <div
                  style={{
                    display: "flex",
                    fontSize: 28,
                    fontWeight: 800,
                    color: rankColors[idx] ?? "#94a3b8",
                    width: "40px",
                  }}
                >
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                </div>

                {/* Name */}
                <div style={{ display: "flex", flex: 1, fontSize: 24, fontWeight: 700 }}>
                  {c.name}
                </div>

                {/* Score */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      fontSize: 28,
                      fontWeight: 800,
                      color: idx === 0 ? "#fbbf24" : "white",
                    }}
                  >
                    {c.totalScore > 0 ? `+${c.totalScore}` : c.totalScore}pt
                  </div>
                  <div style={{ display: "flex", fontSize: 13, color: "#94a3b8" }}>
                    セ{c.centralScore > 0 ? `+${c.centralScore}` : c.centralScore} / パ
                    {c.pacificScore > 0 ? `+${c.pacificScore}` : c.pacificScore}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "16px",
            fontSize: 14,
            color: "#64748b",
          }}
        >
          npb-predictions.vercel.app
        </div>
      </div>
    ),
    size
  );
}
