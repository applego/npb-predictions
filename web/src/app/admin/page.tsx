"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

// --- Admin UID check ---

const ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UIDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const { firebaseUser, loading } = useAuth();
  if (loading) return { isAdmin: false, loading: true };
  if (!firebaseUser) return { isAdmin: false, loading: false };
  const isAdmin = ADMIN_UIDS.includes(firebaseUser.uid);
  return { isAdmin, loading: false };
}

// --- Types ---

interface ApiResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

// --- Helpers ---

async function apiPost(url: string, body: unknown): Promise<ApiResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json() as { error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? res.statusText };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// --- Season Management ---

function SeasonManager() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [label, setLabel] = useState("");
  const [lockDate, setLockDate] = useState("");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    const r = await apiPost("/api/admin/seasons", {
      year,
      label: label || `${year}シーズン`,
      lockDate: lockDate || undefined,
    });
    setResult(r);
    setLoading(false);
  }

  return (
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold">シーズン管理</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">年</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">ラベル</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={`${year}シーズン`}
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            予想ロック日
          </label>
          <input
            type="date"
            value={lockDate}
            onChange={(e) => setLockDate(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </div>
      </div>
      <button
        onClick={handleCreate}
        disabled={loading}
        className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "作成中..." : "シーズン作成"}
      </button>
      <ResultDisplay result={result} />
    </section>
  );
}

// --- User Manager ---

interface User {
  id: number;
  name: string;
  slug: string;
  avatarUrl: string | null;
  sourceUrl: string | null;
}

function UserManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadUsers() {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) setUsers((await res.json()) as User[]);
    } catch {
      // ignore
    }
  }

  useEffect(() => { void loadUsers(); }, []);

  async function handleAdd() {
    setLoading(true);
    const r = await apiPost("/api/admin/users", {
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
      avatarUrl: avatarUrl || undefined,
      sourceUrl: sourceUrl || undefined,
    });
    setResult(r);
    if (r.ok) {
      setName("");
      setSlug("");
      setAvatarUrl("");
      setSourceUrl("");
      await loadUsers();
    }
    setLoading(false);
  }

  return (
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold">ユーザー管理</h2>

      {/* Existing users */}
      {users.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-gray-600">登録済みユーザー ({users.length}人)</h3>
          <ul className="divide-y rounded border">
            {users.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="font-medium">{u.name}</span>
                <span className="text-gray-400">@{u.slug}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add user form */}
      <h3 className="mb-3 text-sm font-semibold text-gray-600">ユーザー追加</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">名前 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 田中太郎"
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">スラッグ</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="自動生成（空白でOK）"
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">アバターURL</label>
          <input
            type="text"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">媒体URL（別タブリンク用）</label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://www.youtube.com/..."
            className="w-full rounded border px-3 py-2"
          />
        </div>
      </div>
      <button
        onClick={handleAdd}
        disabled={loading || !name.trim()}
        className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "追加中..." : "ユーザー追加"}
      </button>
      <ResultDisplay result={result} />
    </section>
  );
}

// --- Seed Import ---

const DEFAULT_MEMBERS = [
  { name: "メンバー1", slug: "member1" },
  { name: "メンバー2", slug: "member2" },
  { name: "メンバー3", slug: "member3" },
  { name: "メンバー4", slug: "member4" },
  { name: "メンバー5", slug: "member5" },
];

function SeedImporter() {
  const [usersJson, setUsersJson] = useState(
    JSON.stringify(DEFAULT_MEMBERS, null, 2)
  );
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleImport() {
    setLoading(true);
    try {
      const parsed = JSON.parse(usersJson);
      const r = await apiPost("/api/admin/seeds/import", {
        users: parsed,
      });
      setResult(r);
    } catch {
      setResult({ ok: false, error: "Invalid JSON" });
    }
    setLoading(false);
  }

  return (
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold">ユーザー Seed Import</h2>
      <label className="mb-1 block text-sm font-medium">
        ユーザー JSON (name, slug, avatarUrl?)
      </label>
      <textarea
        value={usersJson}
        onChange={(e) => setUsersJson(e.target.value)}
        rows={8}
        className="w-full rounded border px-3 py-2 font-mono text-sm"
      />
      <button
        onClick={handleImport}
        disabled={loading}
        className="mt-4 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "インポート中..." : "ユーザーインポート"}
      </button>
      <ResultDisplay result={result} />
    </section>
  );
}

// --- Actual Standings Updater ---

const CENTRAL_TEAMS = ["巨人", "阪神", "DeNA", "広島", "中日", "ヤクルト"];
const PACIFIC_TEAMS = [
  "オリックス",
  "ソフトバンク",
  "ロッテ",
  "楽天",
  "西武",
  "日本ハム",
];

interface StandingRow {
  league: "central" | "pacific";
  rank: number;
  teamName: string;
  wins: number;
  losses: number;
  draws: number;
}

function buildDefaultStandings(): StandingRow[] {
  return [
    ...CENTRAL_TEAMS.map((t, i) => ({
      league: "central" as const,
      rank: i + 1,
      teamName: t,
      wins: 0,
      losses: 0,
      draws: 0,
    })),
    ...PACIFIC_TEAMS.map((t, i) => ({
      league: "pacific" as const,
      rank: i + 1,
      teamName: t,
      wins: 0,
      losses: 0,
      draws: 0,
    })),
  ];
}

interface Season {
  id: number;
  year: number;
  label: string;
  isActive: boolean;
}

function StandingsUpdater() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState<number | "">("");
  const [standings, setStandings] = useState<StandingRow[]>(
    buildDefaultStandings
  );
  const [isFinal, setIsFinal] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/seasons")
      .then((r) => r.json() as Promise<Season[]>)
      .then((data) => {
        setSeasons(data);
        const active = data.find((s) => s.isActive);
        if (active) setSeasonId(active.id);
      })
      .catch(() => undefined);
  }, []);

  const selectedSeason = seasons.find((s) => s.id === seasonId);

  function updateRow(
    idx: number,
    field: keyof StandingRow,
    value: string | number
  ) {
    setStandings((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  async function handleSubmit() {
    if (!seasonId) {
      setResult({ ok: false, error: "シーズンを選択してください" });
      return;
    }
    setLoading(true);
    const r = await apiPost("/api/admin/actual-standings/snapshot", {
      standings: standings.map((s) => ({
        ...s,
        seasonId,
        isFinal,
      })),
    });
    setResult(r);
    setLoading(false);
  }

  async function handleRecalculate() {
    if (!selectedSeason) {
      setResult({ ok: false, error: "シーズンを選択してください" });
      return;
    }
    setLoading(true);
    const r = await apiPost(
      `/api/admin/recalculate-scores?year=${selectedSeason.year}`,
      {}
    );
    setResult(r);
    setLoading(false);
  }

  async function handleUpdateAndRecalculate() {
    if (!seasonId || !selectedSeason) {
      setResult({ ok: false, error: "シーズンを選択してください" });
      return;
    }
    setLoading(true);
    const snapshotResult = await apiPost("/api/admin/actual-standings/snapshot", {
      standings: standings.map((s) => ({
        ...s,
        seasonId,
        isFinal,
      })),
    });
    if (!snapshotResult.ok) {
      setResult(snapshotResult);
      setLoading(false);
      return;
    }
    const scoreResult = await apiPost(
      `/api/admin/recalculate-scores?year=${selectedSeason.year}`,
      {}
    );
    setResult({
      ok: scoreResult.ok,
      data: { snapshot: snapshotResult.data, scores: scoreResult.data },
      error: scoreResult.error,
    });
    setLoading(false);
  }

  function renderLeague(
    label: string,
    league: "central" | "pacific"
  ) {
    const rows = standings.filter((s) => s.league === league);
    const offset = league === "central" ? 0 : 6;
    return (
      <div>
        <h3 className="mb-2 font-semibold">{label}</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-1">順位</th>
              <th className="py-1">チーム</th>
              <th className="py-1">勝</th>
              <th className="py-1">敗</th>
              <th className="py-1">分</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.teamName} className="border-b">
                <td className="py-1">{row.rank}</td>
                <td className="py-1">{row.teamName}</td>
                <td className="py-1">
                  <input
                    type="number"
                    value={row.wins}
                    onChange={(e) =>
                      updateRow(offset + i, "wins", Number(e.target.value))
                    }
                    className="w-16 rounded border px-2 py-1"
                  />
                </td>
                <td className="py-1">
                  <input
                    type="number"
                    value={row.losses}
                    onChange={(e) =>
                      updateRow(offset + i, "losses", Number(e.target.value))
                    }
                    className="w-16 rounded border px-2 py-1"
                  />
                </td>
                <td className="py-1">
                  <input
                    type="number"
                    value={row.draws}
                    onChange={(e) =>
                      updateRow(offset + i, "draws", Number(e.target.value))
                    }
                    className="w-16 rounded border px-2 py-1"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold">実順位更新</h2>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">シーズン</label>
          {seasons.length > 0 ? (
            <select
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value ? Number(e.target.value) : "")}
              className="rounded border px-3 py-2 text-sm"
            >
              <option value="">— 選択 —</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}{s.isActive ? " (現在)" : ""}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value ? Number(e.target.value) : "")}
              placeholder="Season ID"
              className="w-24 rounded border px-3 py-2 text-sm"
            />
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isFinal}
            onChange={(e) => setIsFinal(e.target.checked)}
          />
          最終確定
        </label>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {renderLeague("セ・リーグ", "central")}
        {renderLeague("パ・リーグ", "pacific")}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={() => { void handleUpdateAndRecalculate(); }}
          disabled={loading || !seasonId}
          className="rounded bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {loading ? "処理中..." : "順位更新 + スコア再計算 (一括)"}
        </button>
        <button
          onClick={() => { void handleSubmit(); }}
          disabled={loading || !seasonId}
          className="rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? "送信中..." : "順位のみ登録"}
        </button>
        <button
          onClick={() => { void handleRecalculate(); }}
          disabled={loading || !seasonId}
          className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? "計算中..." : "スコアのみ再計算"}
        </button>
      </div>
      <ResultDisplay result={result} />
    </section>
  );
}

// --- Result Display ---

function ResultDisplay({ result }: { result: ApiResult | null }) {
  if (!result) return null;
  return (
    <div
      className={`mt-3 rounded p-3 text-sm ${
        result.ok
          ? "bg-green-50 text-green-800"
          : "bg-red-50 text-red-800"
      }`}
    >
      {result.ok ? (
        <pre className="overflow-auto whitespace-pre-wrap">
          {JSON.stringify(result.data, null, 2)}
        </pre>
      ) : (
        <p>Error: {result.error}</p>
      )}
    </div>
  );
}

// --- Page ---

export default function AdminPage() {
  const { firebaseUser, loading: authLoading, signIn } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  if (authLoading || adminLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div
          className="rounded-xl p-10 text-center"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-primary)" }}
        >
          <p style={{ color: "var(--text-secondary)" }}>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div
          className="w-full max-w-md space-y-4 rounded-xl p-8 text-center"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-primary)" }}
        >
          <h1
            className="text-2xl"
            style={{
              fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
              color: "var(--text-primary)",
              letterSpacing: "0.08em",
            }}
          >
            ADMIN
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            管理画面にアクセスするにはログインしてください。
          </p>
          <button
            onClick={signIn}
            className="rounded px-5 py-2.5 text-sm font-medium transition-all"
            style={{
              background: "rgba(229,57,53,0.12)",
              border: "1px solid rgba(229,57,53,0.25)",
              color: "var(--stitch)",
            }}
          >
            Googleでログイン
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div
          className="w-full max-w-md space-y-3 rounded-xl p-8 text-center"
          style={{ background: "var(--bg-surface)", border: "1px solid rgba(239,68,68,0.15)" }}
        >
          <h1
            className="text-2xl"
            style={{
              fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
              color: "rgba(239,68,68,0.8)",
              letterSpacing: "0.08em",
            }}
          >
            ACCESS DENIED
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            このアカウントにはAdmin権限がありません。
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            UID: {firebaseUser.uid}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl"
          style={{
            fontFamily: "var(--font-display, 'Bebas Neue', Impact, sans-serif)",
            color: "var(--text-primary)",
            letterSpacing: "0.08em",
          }}
        >
          ADMIN
        </h1>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {firebaseUser.email}
        </span>
      </div>
      <SeasonManager />
      <UserManager />
      <SeedImporter />
      <StandingsUpdater />
    </div>
  );
}
