"use client";

import { useEffect, useState } from "react";
import { recordGrowth } from "@/lib/growth-events";

/** A user gesture is always required. Failed copy/share is never reported as success. */
export function ResultShare({ path, title }: { path: string; title: string }) {
  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => {
    const url = new URL(path, window.location.origin);
    url.searchParams.set("utm_source", "x");
    url.searchParams.set("utm_medium", "social");
    url.searchParams.set("utm_campaign", "season_results");
    setShareUrl(`https://x.com/intent/post?${new URLSearchParams({ text: title, url: url.href })}`);
  }, [path, title]);
  const [message, setMessage] = useState("");
  const [fallback, setFallback] = useState("");
  async function share() {
    const url = new URL(path, window.location.origin).href;
    setFallback("");
    try {
      if (navigator.share) {
        await navigator.share({ title, text: title, url });
        setMessage("共有操作が完了しました");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setMessage("リンクをコピーしました");
      } else {
        setFallback(url);
        setMessage("下のリンクを選択してコピーしてください");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setMessage("");
        return;
      }
      setFallback(url);
      setMessage("自動で共有できませんでした。リンクをコピーしてください");
    }
  }
  return (
    <div className="result-share">
      {shareUrl && <a className="result-button result-button-x" href={shareUrl} onClick={() => {
        const params = new URL(path, window.location.origin).searchParams;
        recordGrowth("x_share_start", Number(params.get("year")), params.get("league") ?? "central");
      }} target="_blank" rel="noopener noreferrer" aria-label="この結果をXで共有する"><span aria-hidden="true">𝕏</span> Xで結果を共有</a>}
      <button className="result-button result-button-secondary" type="button" onClick={share}>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7" /></svg>
        結果をシェア
      </button>
      <span role="status" aria-live="polite" className="result-share-message">{message}</span>
      {fallback && <input aria-label="共有リンク" readOnly value={fallback} onFocus={(event) => event.target.select()} />}
    </div>
  );
}
