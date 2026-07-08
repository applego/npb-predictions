"use client";

import { useState, useCallback } from "react";
import {
  getTwitterShareUrl,
  getLineShareUrl,
  getShareUrl,
  getShareText,
} from "@/lib/share";

type OgType = "prediction" | "scoreboard" | "monthly-champion" | "weekly";

interface ShareButtonProps {
  type: OgType;
  year?: number;
  userId?: number;
  userName?: string;
  className?: string;
}

export default function ShareButton({
  type,
  year,
  userId,
  userName,
  className = "",
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleShare = useCallback(async () => {
    const params = { year, userId, userName };
    // Try Web Share API first (mobile)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "NPB予想リーグ",
          text: getShareText(type, params),
          url: getShareUrl(type, params),
        });
        return;
      } catch {
        // User cancelled or API not supported — fall through to menu
      }
    }
    setShowMenu((prev) => !prev);
  }, [type, year, userId, userName]);

  const handleCopyUrl = useCallback(async () => {
    const params = { year, userId, userName };
    const url = getShareUrl(type, params);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setShowMenu(false);
  }, [type, year, userId, userName]);

  const shareParams = { year, userId, userName };
  const twitterUrl = getTwitterShareUrl(type, shareParams);
  const lineUrl = getLineShareUrl(type, shareParams);

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={handleShare}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        aria-label="共有"
      >
        <ShareIcon />
        <span>共有</span>
      </button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border bg-white py-1 shadow-lg">
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setShowMenu(false)}
            >
              <XIcon />
              X (Twitter)
            </a>
            <a
              href={lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setShowMenu(false)}
            >
              <LineIcon />
              LINE
            </a>
            <button
              onClick={handleCopyUrl}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <CopyIcon />
              {copied ? "コピーしました" : "URLをコピー"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// --- Inline SVG icons (small, no external deps) ---

function ShareIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LineIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#06C755">
      <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738S0 4.935 0 10.304c0 4.813 4.27 8.846 10.035 9.608.391.084.922.258 1.057.592.121.303.079.778.039 1.084l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.539 6.911-4.07 9.428-6.967C23.266 14.315 24 12.44 24 10.304z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
