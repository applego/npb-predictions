"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const PRIMARY = [
  { href: "/", label: "答え合わせ", short: "結果", icon: "◎" },
  { href: "/rankings/predictions", label: "予想一覧", short: "予想一覧", icon: "▤" },
  { href: "/rankings/all-time", label: "通算成績", short: "通算成績", icon: "↗" },
];
const MORE = [
  { href: "/rankings", label: "解説者の答え合わせ一覧" },
  { href: "/rankings/live", label: "リーグ順位" },
  { href: "/rankings/scoreboard", label: "ポイント制スコアボード" },
  { href: "/rankings/titles", label: "個人タイトル予想" },
  { href: "/games", label: "試合結果" },
  { href: "/news", label: "ニュース" },
  { href: "/predictions/new", label: "予想をつくる" },
  { href: "/groups", label: "グループ" },
  { href: "/resources", label: "野球の道具箱" },
  { href: "/settings", label: "表示設定" },
];
export function Nav() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const moreRef = useRef<HTMLDetailsElement>(null);
  const active = (href: string) => href === "/" ? pathname === "/" || pathname === "/rankings" : pathname.startsWith(href);
  useEffect(() => {
    if (moreRef.current) moreRef.current.open = false;
  }, [pathname]);
  useEffect(() => {
    function close(event: KeyboardEvent) {
      if (event.key === "Escape" && moreRef.current?.open) {
        moreRef.current.open = false;
        moreRef.current.querySelector("summary")?.focus();
      }
    }
    function outside(event: PointerEvent) {
      if (moreRef.current?.open && event.target instanceof Node && !moreRef.current.contains(event.target)) moreRef.current.open = false;
    }
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", outside); };
  }, []);
  return <>
    <div className="site-primary-nav">{PRIMARY.map((link) => <Link key={link.href} href={link.href} aria-current={active(link.href) ? "page" : undefined}>{link.label}</Link>)}</div>
    <details className="site-more" ref={moreRef}><summary>メニュー <span aria-hidden="true">＋</span></summary><div className="site-more-panel">{[...MORE, ...(isAdmin ? [{ href: "/admin", label: "管理" }] : [])].map((link) => <Link key={link.href} href={link.href} onClick={() => { if (moreRef.current) moreRef.current.open = false; }}>{link.label}</Link>)}</div></details>
    <nav className="site-mobile-nav" aria-label="よく使うページ">{PRIMARY.map((link) => <Link key={link.href} href={link.href} aria-current={active(link.href) ? "page" : undefined}><span aria-hidden="true">{link.icon}</span>{link.short}</Link>)}</nav>
  </>;
}
