import { ImageResponse } from "next/og";
import { getDb } from "@/db";
import { eq, and, desc } from "drizzle-orm";
import { users, seasons, predictions, rankingPicks, scoreSnapshots } from "@/db/schema";

export const runtime = "edge";
export const alt = "ユーザーの順位予想カード";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LEAGUE_LABELS: Record<string, string> = {
  central: "セ・リーグ",
  pacific: "パ・リーグ",
};

const TEAM_COLORS: Record<string, string> = {
  "巨人": "#F97316",
  "阪神": "#FDE047",
  "中日": "#3B82F6",
  "DeNA": "#2563EB",
  "広島": "#EF4444",
  "ヤクルト": "#059669",
  "オリックス": "#1D4ED8",
  "ソフトバンク": "#F59E0B",
  "西武": "#1E3A5F",
  "楽天": "#DC2626",
  "ロッテ": "#000000",
  "日本ハム": "#1E40AF",
};

export default async function Image({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: userIdStr } = await params;
  const userId = parseInt(userIdStr, 10);

  const user = await getDb().query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#1a1a2e",
            color: "white",
            fontSize: 36,
            fontFamily: "sans-serif",
          }}
        >
          NPB Predictions League
        </div>
      ),
      size
    );
  }

  const year = new Date().getFullYear();
  const season = await getDb().query.seasons.findFirst({
    where: eq(seasons.year, year),
  });

  let centralPicks: { rank: number; teamName: string }[] = [];
  let pacificPicks: { rank: number; teamName: string }[] = [];

  if (season) {
    const prediction = await getDb().query.predictions.findFirst({
      where: and(
        eq(predictions.userId, userId),
        eq(predictions.seasonId, season.id)
      ),
      with: { rankingPicks: true },
    });

    if (prediction) {
      centralPicks = prediction.rankingPicks
        .filter((p) => p.league === "central")
        .sort((a, b) => a.rank - b.rank);
      pacificPicks = prediction.rankingPicks
        .filter((p) => p.league === "pacific")
        .sort((a, b) => a.rank - b.rank);
    }
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
          padding: "40px 60px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 16, color: "#94a3b8", marginBottom: "4px" }}>
              NPB Predictions League {year}
            </div>
            <div style={{ fontSize: 36, fontWeight: 800 }}>
              {user.name} の順位予想
            </div>
          </div>
          <div
            style={{
              display: "flex",
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "#2D5A27",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            {user.name.charAt(0)}
          </div>
        </div>

        {/* League columns */}
        <div style={{ display: "flex", gap: "40px", flex: 1 }}>
          {[
            { label: LEAGUE_LABELS.central, picks: centralPicks },
            { label: LEAGUE_LABELS.pacific, picks: pacificPicks },
          ].map((league) => (
            <div
              key={league.label}
              style={{ display: "flex", flexDirection: "column", flex: 1 }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#86efac",
                  marginBottom: "12px",
                  borderBottom: "2px solid #2D5A27",
                  paddingBottom: "8px",
                }}
              >
                {league.label}
              </div>
              {league.picks.map((pick) => (
                <div
                  key={`${league.label}-${pick.rank}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "8px 0",
                    fontSize: 22,
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      fontWeight: 700,
                      color: pick.rank <= 3 ? "#fbbf24" : "#94a3b8",
                    }}
                  >
                    {pick.rank}位
                  </div>
                  <div
                    style={{
                      width: "8px",
                      height: "24px",
                      backgroundColor: TEAM_COLORS[pick.teamName] ?? "#6b7280",
                      borderRadius: "4px",
                    }}
                  />
                  <div style={{ fontWeight: 600 }}>{pick.teamName}</div>
                </div>
              ))}
            </div>
          ))}
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
