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

/** Full block cell for dense 12-column matrices. */
function CellBadge({ team, className }: { team: NpbTeam; className: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-sm font-black ${className}`}
      title={team.shortName}
      aria-label={team.shortName}
      style={{
        background: team.color,
        color: team.textColor,
        padding: "0.32rem 0.2rem",
        fontSize: "0.78rem",
        lineHeight: 1,
        minHeight: "1.8rem",
        width: "100%",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "clip",
        textShadow: team.textColor === "#fff" ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
      }}
    >
      {team.abbr}
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
