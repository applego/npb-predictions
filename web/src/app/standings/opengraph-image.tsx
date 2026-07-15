import { ImageResponse } from "next/og";
import { getDb } from "@/db";
import { eq, desc } from "drizzle-orm";
import { seasons, scoreSnapshots } from "@/db/schema";

export const runtime = "edge";
export const alt = "NPB Predictions League スコアボード";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const year = new Date().getFullYear();

  const season = await getDb().query.seasons.findFirst({
    where: eq(seasons.year, year),
  });

  let entries: { name: string; totalScore: number; rankingScore: number; titleScore: number }[] = [];

  if (season) {
    const scores = await getDb().query.scoreSnapshots.findMany({
      where: eq(scoreSnapshots.seasonId, season.id),
      orderBy: [desc(scoreSnapshots.totalScore)],
      with: { user: true },
    });

    // Deduplicate by userId
    const seen = new Set<number>();
    entries = scores
      .filter((s) => {
        if (seen.has(s.userId)) return false;
        seen.add(s.userId);
        return true;
      })
      .slice(0, 5)
      .map((s) => ({
        name: s.user.name,
        totalScore: s.totalScore,
        rankingScore: s.rankingScore,
        titleScore: s.titleScore,
      }));
  }

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
            {year} スコアボード
          </div>
        </div>

        {/* Scoreboard rows */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            gap: "8px",
          }}
        >
          {entries.length === 0 ? (
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
              まだスコアデータがありません
            </div>
          ) : (
            entries.map((entry, idx) => (
              <div
                key={entry.name}
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
                <div
                  style={{
                    display: "flex",
                    fontSize: 28,
                    fontWeight: 800,
                    color: rankColors[idx] ?? "#94a3b8",
                    width: "40px",
                  }}
                >
                  {idx + 1}
                </div>
                <div style={{ display: "flex", flex: 1, fontSize: 24, fontWeight: 700 }}>
                  {entry.name}
                </div>
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
                    {entry.totalScore}pt
                  </div>
                  <div style={{ display: "flex", fontSize: 13, color: "#94a3b8" }}>
                    順位{entry.rankingScore} + タイトル{entry.titleScore}
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
