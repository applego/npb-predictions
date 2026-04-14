import { ImageResponse } from "next/og";
import { getSeasonByYear, getFinalStandings } from "@/lib/seo-queries";

export const runtime = "edge";
export const alt = "NPB Predictions リーグ シーズン概要";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ year: string }> };

export default async function Image({ params }: Props) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);

  let centralChampion = "";
  let pacificChampion = "";

  const season = await getSeasonByYear(Number.isNaN(year) ? new Date().getFullYear() : year);

  if (season) {
    const [centralStandings, pacificStandings] = await Promise.all([
      getFinalStandings(season.id, "central"),
      getFinalStandings(season.id, "pacific"),
    ]);

    centralChampion = centralStandings[0]?.teamName ?? "";
    pacificChampion = pacificStandings[0]?.teamName ?? "";
  }

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
          padding: "60px",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* NPB Logo/Title */}
        <div
          style={{
            fontSize: 24,
            color: "#94a3b8",
            marginBottom: "16px",
          }}
        >
          NPB Predictions League
        </div>

        {/* Year */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 900,
            marginBottom: "48px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {year}年シーズン
        </div>

        {/* Champions */}
        {(centralChampion || pacificChampion) && (
          <div
            style={{
              display: "flex",
              gap: "40px",
              marginBottom: "32px",
            }}
          >
            {/* Central League Champion */}
            {centralChampion && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "24px 40px",
                  backgroundColor: "rgba(255,255,255,0.08)",
                  borderRadius: "16px",
                  minWidth: "280px",
                }}
              >
                <div style={{ fontSize: 16, color: "#94a3b8", marginBottom: "8px" }}>
                  セ・リーグ優勝
                </div>
                <div style={{ fontSize: 36, fontWeight: 800, color: "#fbbf24" }}>
                  🏆 {centralChampion}
                </div>
              </div>
            )}

            {/* Pacific League Champion */}
            {pacificChampion && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "24px 40px",
                  backgroundColor: "rgba(255,255,255,0.08)",
                  borderRadius: "16px",
                  minWidth: "280px",
                }}
              >
                <div style={{ fontSize: 16, color: "#94a3b8", marginBottom: "8px" }}>
                  パ・リーグ優勝
                </div>
                <div style={{ fontSize: 36, fontWeight: 800, color: "#fbbf24" }}>
                  🏆 {pacificChampion}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            fontSize: 14,
            color: "#64748b",
            marginTop: "auto",
          }}
        >
          順位予想・タイトル予想・的中率ランキング
        </div>
      </div>
    ),
    size
  );
}
