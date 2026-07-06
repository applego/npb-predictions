import Link from "next/link";
import type React from "react";

export function BroadcastBand({ year }: { year?: number | string }) {
  return (
    <div
      className="flex items-center justify-between rounded-sm px-4 py-3"
      style={{ background: "var(--border-strong)", color: "#fff" }}
    >
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1rem",
          fontWeight: 800,
          letterSpacing: "0.08em",
        }}
      >
        NPB PREDICTIONS
      </span>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "0.72rem",
          letterSpacing: "0.18em",
          opacity: 0.82,
        }}
      >
        {year ?? new Date().getFullYear()} SEASON
      </span>
    </div>
  );
}

export function BroadcastHeading({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p
        className="text-[0.68rem] uppercase"
        style={{
          fontFamily: "var(--font-display)",
          letterSpacing: "0.22em",
          color: "var(--field)",
        }}
      >
        {kicker}
      </p>
      <h1
        className="mt-1"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1.6rem, 4vw, 2.45rem)",
          fontWeight: 800,
          letterSpacing: "0.02em",
          color: "var(--text-primary)",
          lineHeight: 1.08,
        }}
      >
        {title}
      </h1>
      {children && (
        <div className="mt-2 text-sm leading-6" style={{ color: "var(--text-muted)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function BroadcastPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-sm ${className}`}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-primary)",
        boxShadow: "0 8px 22px rgba(20,18,12,0.06)",
      }}
    >
      {children}
    </section>
  );
}

export function BroadcastChip({
  active,
  children,
  href,
}: {
  active?: boolean;
  children: React.ReactNode;
  href?: string;
}) {
  const style = {
    background: active ? "var(--field)" : "var(--bg-elevated)",
    color: active ? "#fff" : "var(--text-secondary)",
    border: `1px solid ${active ? "var(--field)" : "var(--border-primary)"}`,
    fontWeight: active ? 800 : 650,
  };
  const className = "inline-flex min-h-9 items-center rounded-sm px-3 text-xs transition-all";

  if (href) {
    return (
      <Link href={href} className={className} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <span className={className} style={style}>
      {children}
    </span>
  );
}
