import { getTeamByName, type NpbTeam } from "@/lib/teams";

interface TeamBadgeProps {
  teamName: string;
  /** "cell" = fills entire table cell (matrix), "tag" = inline tag */
  variant?: "cell" | "tag";
  className?: string;
}

/**
 * Team badge component.
 * "cell" variant: full-width colored block for prediction matrix (like TV broadcast / newspaper).
 * "tag" variant: inline colored label.
 */
export function TeamBadge({ teamName, variant = "cell", className = "" }: TeamBadgeProps) {
  const team = getTeamByName(teamName);

  if (!team) {
    return (
      <span
        className={`inline-block rounded px-2 py-1 text-xs ${className}`}
        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
      >
        {teamName}
      </span>
    );
  }

  if (variant === "cell") return <CellBadge team={team} className={className} />;
  return <TagBadge team={team} className={className} />;
}

/** Full block cell — fills the matrix cell like Image #6 reference */
function CellBadge({ team, className }: { team: NpbTeam; className: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded font-bold ${className}`}
      style={{
        background: team.color,
        color: team.textColor,
        padding: "0.5rem 0.25rem",
        fontSize: "0.85rem",
        lineHeight: 1.2,
        minHeight: "2.25rem",
        textShadow: team.textColor === "#fff" ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
      }}
    >
      {team.shortName}
    </div>
  );
}

/** Inline tag — for use in text contexts */
function TagBadge({ team, className }: { team: NpbTeam; className: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-bold ${className}`}
      style={{
        background: team.color,
        color: team.textColor,
      }}
    >
      {team.abbr}
    </span>
  );
}
