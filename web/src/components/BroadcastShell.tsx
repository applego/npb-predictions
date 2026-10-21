import Link from "next/link";
import type React from "react";

/** Shared secondary-page shell; exported API retained for existing callers. */
export function BroadcastBand({ year }: { year?: number | string }) {
  return <div className="result-page-band"><Link href="/">NPB 予想リーグ</Link><span>{year ?? new Date().getFullYear()} シーズン</span></div>;
}
export function BroadcastHeading({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) {
  return <div className="result-page-heading"><p>{kicker}</p><h1>{title}</h1>{children && <div>{children}</div>}</div>;
}
export function BroadcastPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`result-page-panel ${className}`}>{children}</section>;
}
export function BroadcastChip({ active, children, href }: { active?: boolean; children: React.ReactNode; href?: string }) {
  const className = `result-page-chip${active ? " is-active" : ""}`;
  return href ? <Link href={href} className={className} aria-current={active ? "page" : undefined}>{children}</Link> : <span className={className}>{children}</span>;
}
