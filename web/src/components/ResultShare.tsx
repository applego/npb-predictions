"use client";

import { useState } from "react";

/** A user gesture is always required. Failed copy/share is never reported as success. */
export function ResultShare({ path, title }: { path: string; title: string }) {
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
      <button className="result-button result-button-secondary" type="button" onClick={share}>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7" /></svg>
        結果をシェア
      </button>
      <span role="status" aria-live="polite" className="result-share-message">{message}</span>
      {fallback && <input aria-label="共有リンク" readOnly value={fallback} onFocus={(event) => event.target.select()} />}
    </div>
  );
}
