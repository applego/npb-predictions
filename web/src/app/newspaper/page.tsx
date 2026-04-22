export const runtime = "edge";

import { NPB_TEAMS } from "@/lib/teams";

export default function NewspaperPreviewPage() {
  const central = NPB_TEAMS.filter((t) => t.league === "central");
  const pacific = NPB_TEAMS.filter((t) => t.league === "pacific");

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "48px 24px" }}>
      <h1
        style={{
          fontSize: 32,
          fontWeight: 900,
          letterSpacing: "0.04em",
          marginBottom: 8,
        }}
      >
        一面プレビュー — 12球団
      </h1>
      <p style={{ color: "var(--text-muted)", marginBottom: 32, fontSize: 14 }}>
        各球団のモック新聞一面（現在は阪神のテストデータを流用中、v2でDB+LLM連携予定）
      </p>

      <Section title="セントラル・リーグ" teams={central} />
      <Section title="パシフィック・リーグ" teams={pacific} />
    </div>
  );
}

function Section({
  title,
  teams,
}: {
  title: string;
  teams: typeof NPB_TEAMS;
}) {
  return (
    <section style={{ marginBottom: 56 }}>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 16,
          letterSpacing: "0.08em",
          borderBottom: "2px solid var(--border-primary)",
          paddingBottom: 8,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 20,
        }}
      >
        {teams.map((team) => (
          <a
            key={team.slug}
            href={`/api/newspaper/${team.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              textDecoration: "none",
              color: "inherit",
              borderRadius: 8,
              overflow: "hidden",
              border: `3px solid ${team.color}`,
              background: "#fff",
              transition: "transform 0.15s",
            }}
          >
            <div
              style={{
                aspectRatio: "1080 / 1920",
                background: "#faf7f0",
                overflow: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/newspaper/${team.slug}`}
                alt={`${team.name} 新聞一面`}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                loading="lazy"
              />
            </div>
            <div
              style={{
                padding: "10px 12px",
                background: team.color,
                color: team.textColor,
                fontSize: 14,
                fontWeight: 700,
                textAlign: "center",
                letterSpacing: "0.05em",
              }}
            >
              {team.name}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
