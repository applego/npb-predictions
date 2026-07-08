"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

interface GroupSummary {
  id: number;
  name: string;
  slug: string;
  inviteCode: string;
  memberCount: number;
  createdAt: string;
}

export default function GroupsPage() {
  const { firebaseUser, appUser, loading, signIn } = useAuth();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchGroups = useCallback(async () => {
    if (!firebaseUser) {
      setFetching(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/groups/my?firebaseUid=${encodeURIComponent(firebaseUser.uid)}`,
      );
      if (res.ok) {
        const data = (await res.json()) as { groups?: GroupSummary[] };
        setGroups(data.groups ?? []);
      }
    } finally {
      setFetching(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (!loading) fetchGroups();
  }, [loading, fetchGroups]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          firebaseUid: firebaseUser.uid,
        }),
      });
      if (res.ok) {
        setNewName("");
        setShowCreate(false);
        await fetchGroups();
      }
    } finally {
      setCreating(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "var(--stitch)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!firebaseUser || !appUser) {
    return (
      <div className="space-y-5">
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
            letterSpacing: "0.04em",
            color: "var(--text-primary)",
          }}
        >
          <span style={{ color: "var(--stitch)" }}>対決</span>グループ
        </h1>
        <div className="card rounded-lg p-10 text-center">
          <p style={{ color: "var(--text-secondary)" }}>
            対決グループに参加するにはログインが必要です
          </p>
          <button
            onClick={signIn}
            className="mt-4 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            style={{ background: "var(--stitch)" }}
          >
            Googleでログイン
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
              letterSpacing: "0.04em",
              color: "var(--text-primary)",
            }}
          >
            <span style={{ color: "var(--stitch)" }}>対決</span>グループ
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
            友達とグループを作って予想の的中率を競おう
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          style={{ background: "var(--stitch)" }}
        >
          + 新しいグループ
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="card rounded-lg p-5">
          <h2
            className="mb-3 text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            グループ作成
          </h2>
          <form onSubmit={handleCreate} className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="グループ名（例: 俺たちリーグ）"
              className="flex-1 rounded-lg border px-3 py-2 text-sm"
              style={{
                borderColor: "var(--border-primary)",
                background: "var(--bg-base)",
              }}
              maxLength={50}
              required
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="rounded-lg px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--stitch)" }}
            >
              {creating ? "作成中..." : "作成"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg border px-4 py-2 text-sm"
              style={{
                borderColor: "var(--border-primary)",
                color: "var(--text-secondary)",
              }}
            >
              キャンセル
            </button>
          </form>
        </div>
      )}

      {/* Groups list */}
      {groups.length === 0 ? (
        <div className="card rounded-lg p-10 text-center">
          <p style={{ color: "var(--text-muted)" }}>
            まだグループに参加していません
          </p>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            新しいグループを作るか、招待コードで参加しましょう
          </p>
          <Link
            href="/groups/join"
            className="mt-4 inline-block rounded-lg border px-5 py-2.5 text-sm font-medium transition hover:opacity-90"
            style={{
              borderColor: "var(--stitch)",
              color: "var(--stitch)",
            }}
          >
            招待コードで参加
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.slug}`}
              className="card rounded-lg p-4 transition"
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ background: "var(--stitch)" }}
                >
                  {group.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    className="truncate text-sm font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {group.name}
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {group.memberCount}人のメンバー
                  </p>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  style={{ color: "var(--text-muted)" }}
                >
                  <path
                    d="M6 4L10 8L6 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Join link */}
      {groups.length > 0 && (
        <div className="flex justify-center gap-3">
          <Link
            href="/groups/join"
            className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:opacity-90"
            style={{
              borderColor: "var(--border-primary)",
              color: "var(--text-secondary)",
            }}
          >
            招待コードで参加
          </Link>
        </div>
      )}
    </div>
  );
}
