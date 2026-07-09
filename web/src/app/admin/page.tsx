"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import {
  NUMBER_FONTS,
  COLOR_THEMES,
  DEFAULT_NUMBER_FONT_ID,
  DEFAULT_COLOR_THEME_ID,
} from "@/lib/theme-presets";

// --- Admin check ---
// Delegates to AuthContext.isAdmin, which allows ADMIN_UIDS, role==="admin",
// and the email allow-list (applegorillappa@gmail.com + NEXT_PUBLIC_ADMIN_EMAILS).

function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const { loading, isAdmin } = useAuth();
  if (loading) return { isAdmin: false, loading: true };
  return { isAdmin, loading: false };
}

// --- Types ---

interface ApiResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

// --- Helpers ---

const ADMIN_THEME_LABELS: Record<string, string> = {
  baseball: "野球場",
  stadium: "スタジアム",
  newspaper: "新聞",
  night: "ナイター",
  "sports-red": "スポーツ赤",
  "sports-blue": "スポーツ青",
  "editorial-cream-crimson": "クリーム赤",
  "editorial-pure-paper": "白紙面",
  "editorial-sepia-archive": "セピア紙面",
  "editorial-forest-ivory": "深緑",
  "editorial-navy-ivory": "紺",
  "editorial-stone-orange": "石版オレンジ",
  "editorial-charcoal-gold": "黒金",
  "editorial-midnight-red": "深夜赤",
  "editorial-rose-plum": "ローズ",
  "editorial-matcha-cream": "抹茶",
  "editorial-sky-vermillion": "空色朱",
  "editorial-paper-black": "墨黒",
  broadcast: "放送席",
  "stadium-night": "ナイター",
  newsprint: "紙面",
  "newspaper-mincho": "新聞明朝",
};

async function apiPost(url: string, body: unknown): Promise<ApiResult> {
  try {
    const res = await fetchWithAuth(url, {
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
  source: string | null;
  avatarUrl: string | null;
  sourceUrl: string | null;
}

interface YTChannel {
  channelId: string;
  title: string;
  description: string;
  thumbnail: string | null;
  url: string;
}

function UserSourceEditor({ user, onSaved }: { user: User; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [sourceUrl, setSourceUrl] = useState(user.sourceUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytCandidates, setYtCandidates] = useState<YTChannel[] | null>(null);
  const [ytError, setYtError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceUrl: sourceUrl || null }),
    });
    setSaving(false);
    setEditing(false);
    setYtCandidates(null);
    onSaved();
  }

  async function searchYouTube() {
    setYtLoading(true);
    setYtError(null);
    setYtCandidates(null);
    try {
      const res = await fetch(`/api/admin/youtube-search?q=${encodeURIComponent(user.name)}`);
      const data = (await res.json()) as { channels?: YTChannel[]; error?: string };
      if (!res.ok || data.error) { setYtError(data.error ?? "検索失敗"); return; }
      setYtCandidates(data.channels ?? []);
    } catch (e) {
      setYtError(String(e));
    } finally {
      setYtLoading(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        {user.sourceUrl ? (
          <a href={user.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="max-w-[180px] truncate text-xs text-blue-600 hover:underline">
            {user.sourceUrl}
          </a>
        ) : (
          <span className="text-xs text-gray-400">未設定</span>
        )}
        <button onClick={() => setEditing(true)}
          className="rounded border px-2 py-0.5 text-[11px] text-gray-500 hover:bg-gray-50">
          編集
        </button>
        {user.source === "YouTube" && (
          <button onClick={searchYouTube} disabled={ytLoading}
            className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] text-red-600 hover:bg-red-100 disabled:opacity-50">
            {ytLoading ? "検索中…" : "▶ YT検索"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://www.youtube.com/..."
          className="flex-1 rounded border px-2 py-1 text-xs" />
        <button onClick={save} disabled={saving}
          className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? "保存中" : "保存"}
        </button>
        <button onClick={() => { setEditing(false); setYtCandidates(null); }}
          className="rounded border px-3 py-1 text-xs text-gray-500">
          キャンセル
        </button>
      </div>

      {/* YouTube search candidates */}
      {user.source === "YouTube" && (
        <button onClick={searchYouTube} disabled={ytLoading}
          className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-600 hover:bg-red-100 disabled:opacity-50">
          {ytLoading ? "検索中…" : "▶ YouTube チャンネルを検索"}
        </button>
      )}
      {ytError && <p className="text-[11px] text-red-500">{ytError}</p>}
      {ytCandidates && ytCandidates.length === 0 && (
        <p className="text-[11px] text-gray-400">候補が見つかりませんでした</p>
      )}
      {ytCandidates && ytCandidates.map((ch) => (
        <div key={ch.channelId}
          className="flex items-center gap-2 rounded border bg-gray-50 p-2 text-xs">
          {ch.thumbnail && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={ch.thumbnail} alt="" className="h-8 w-8 rounded-full object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{ch.title}</p>
            <p className="truncate text-gray-400">{ch.description}</p>
          </div>
          <button
            onClick={() => { setSourceUrl(ch.url); setYtCandidates(null); }}
            className="shrink-0 rounded bg-red-600 px-2 py-0.5 text-white hover:bg-red-700">
            採用
          </button>
        </div>
      ))}
    </div>
  );
}

function UserManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [source, setSource] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  async function loadUsers() {
    try {
      const res = await fetchWithAuth("/api/admin/users");
      if (res.ok) setUsers((await res.json()) as User[]);
    } catch { /* ignore */ }
  }

  useEffect(() => { void loadUsers(); }, []);

  async function handleAdd() {
    setLoading(true);
    const r = await apiPost("/api/admin/users", {
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
      source: source || undefined,
      avatarUrl: avatarUrl || undefined,
      sourceUrl: sourceUrl || undefined,
    });
    setResult(r);
    if (r.ok) {
      setName(""); setSlug(""); setSource(""); setAvatarUrl(""); setSourceUrl("");
      await loadUsers();
    }
    setLoading(false);
  }

  const filtered = filter
    ? users.filter((u) => u.name.includes(filter) || (u.source ?? "").includes(filter))
    : users;

  const noUrl = filtered.filter((u) => !u.sourceUrl);
  const hasUrl = filtered.filter((u) => u.sourceUrl);

  return (
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold">ユーザー管理</h2>

      {/* Existing users */}
      {users.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-600">
              登録済みユーザー ({users.length}人)
              {noUrl.length > 0 && (
                <span className="ml-2 text-orange-500">URL未設定 {noUrl.length}人</span>
              )}
            </h3>
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="名前・媒体で絞り込み"
              className="rounded border px-2 py-1 text-xs"
            />
          </div>

          {/* URL未設定 */}
          {noUrl.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-medium text-orange-500">▼ URL未設定</p>
              <ul className="divide-y rounded border">
                {noUrl.map((u) => (
                  <li key={u.id} className="grid grid-cols-[140px_80px_1fr] items-start gap-3 px-3 py-2 text-sm">
                    <span className="font-medium truncate">{u.name}</span>
                    <span className="text-xs text-gray-400 truncate">{u.source ?? "—"}</span>
                    <UserSourceEditor user={u} onSaved={loadUsers} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* URL設定済み */}
          {hasUrl.length > 0 && (
            <details>
              <summary className="cursor-pointer text-[11px] font-medium text-gray-400 hover:text-gray-600">
                ▼ URL設定済み ({hasUrl.length}人)
              </summary>
              <ul className="mt-1 divide-y rounded border">
                {hasUrl.map((u) => (
                  <li key={u.id} className="grid grid-cols-[140px_80px_1fr] items-start gap-3 px-3 py-2 text-sm">
                    <span className="font-medium truncate">{u.name}</span>
                    <span className="text-xs text-gray-400 truncate">{u.source ?? "—"}</span>
                    <UserSourceEditor user={u} onSaved={loadUsers} />
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Add user form */}
      <h3 className="mb-3 text-sm font-semibold text-gray-600">ユーザー追加</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">名前 *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="例: 田中太郎" className="w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">スラッグ</label>
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)}
            placeholder="自動生成（空白でOK）" className="w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">媒体種別</label>
          <select value={source} onChange={(e) => setSource(e.target.value)}
            className="w-full rounded border px-3 py-2">
            <option value="">選択...</option>
            <option>YouTube</option>
            <option>テレビ</option>
            <option>新聞</option>
            <option>雑誌</option>
            <option>ラジオ</option>
            <option>Web</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">アバターURL</label>
          <input type="text" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..." className="w-full rounded border px-3 py-2" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">媒体URL</label>
          <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://www.youtube.com/@channel" className="w-full rounded border px-3 py-2" />
        </div>
      </div>
      <button onClick={handleAdd} disabled={loading || !name.trim()}
        className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
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

interface ScrapedStanding {
  league: "central" | "pacific";
  rank: number;
  teamName: string;
  wins: number;
  losses: number;
  draws: number;
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
  const [scraping, setScraping] = useState(false);

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

  async function handleScrapeNpb() {
    setScraping(true);
    setResult(null);
    try {
      const res = await fetchWithAuth("/api/admin/scrape-standings", { method: "POST" });
      const data = await res.json() as { standings?: ScrapedStanding[]; error?: string; scrapedAt?: string; savedToSeasons?: number[] };
      if (!res.ok) {
        setResult({ ok: false, error: data.error ?? res.statusText });
        return;
      }
      // Populate form from scraped data
      const scraped = data.standings ?? [];
      setStandings((prev) =>
        prev.map((row) => {
          const match = scraped.find(
            (s) => s.league === row.league && s.rank === row.rank
          );
          return match
            ? { ...row, teamName: match.teamName, wins: match.wins, losses: match.losses, draws: match.draws }
            : row;
        })
      );
      setResult({
        ok: true,
        data: {
          message: `npb.jpから${scraped.length}チームの順位を取得・保存しました`,
          scrapedAt: data.scrapedAt,
          savedToSeasons: data.savedToSeasons,
        },
      });
    } catch (e) {
      setResult({ ok: false, error: String(e) });
    } finally {
      setScraping(false);
    }
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">実順位更新</h2>
        <button
          onClick={() => { void handleScrapeNpb(); }}
          disabled={scraping || loading}
          className="rounded bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {scraping ? "取得中..." : "NPBから自動取得"}
        </button>
      </div>
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
        <p>エラー: {result.error}</p>
      )}
    </div>
  );
}

// --- Site theme / font (admin sets the released site-wide look) ---

function SiteThemeAdmin() {
  const [numFont, setNumFont] = useState(DEFAULT_NUMBER_FONT_ID);
  const [colorTheme, setColorTheme] = useState(DEFAULT_COLOR_THEME_ID);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings?scope=site")
      .then((r) => r.json())
      .then((d) => {
        const s = d as Record<string, string>;
        if (s.font_number) setNumFont(s.font_number);
        if (s.color_theme) setColorTheme(s.color_theme);
      })
      .catch(() => {});
  }, []);

  const save = useCallback(async (key: string, value: string) => {
    setSaving(true);
    setMessage("");
    const res = await fetchWithAuth("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value, scope: "site" }),
    });
    setSaving(false);
    setMessage(
      res.ok
        ? "サイト設定を保存しました — 「適用」で全体に反映"
        : "保存できませんでした（管理者権限を確認してください）"
    );
  }, []);

  return (
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-bold">サイトテーマ・フォント設定</h2>
      <p className="mb-4 text-xs text-gray-500">
        サイト全体の配色と数字フォント（リリースの見た目）を設定します。各ユーザーは
        /settings で自分の配色と数字フォントを上書きできます。
      </p>
      {message && (
        <p className="mb-3 text-sm" style={{ color: "var(--field)" }}>
          {message}
        </p>
      )}

      <h3 className="mb-2 text-sm font-semibold text-gray-600">カラーテーマ</h3>
      <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {COLOR_THEMES.map((t) => {
          const active = colorTheme === t.id;
          const v = t.vars;
          return (
            <button
              key={t.id}
              type="button"
              disabled={saving}
              onClick={() => {
                setColorTheme(t.id);
                void save("color_theme", t.id);
              }}
              className="rounded-md p-2 text-left"
              style={{
                background: v["--bg-base"],
                border: active
                  ? `2px solid ${v["--stitch"]}`
                  : `1px solid ${v["--border-primary"]}`,
              }}
            >
              <div className="mb-1 flex items-center justify-between">
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: v["--text-primary"] }}>
                  {ADMIN_THEME_LABELS[t.id] ?? t.name}
                </span>
                {active && (
                  <span
                    className="rounded px-1 text-[9px] font-bold"
                    style={{ background: v["--stitch"], color: "#fff" }}
                  >
                    選択中
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                {[v["--bg-base"], v["--bg-surface"], v["--stitch"], v["--field"], v["--dirt"], v["--text-primary"]].map(
                  (c, i) => (
                    <span
                      key={i}
                      style={{
                        width: "1.1rem",
                        height: "1.1rem",
                        borderRadius: "3px",
                        background: c,
                        border: `1px solid ${v["--border-primary"]}`,
                      }}
                    />
                  )
                )}
              </div>
            </button>
          );
        })}
      </div>

      <h3 className="mb-2 text-sm font-semibold text-gray-600">数字フォント</h3>
      <div className="mb-5 flex flex-wrap gap-2">
        {NUMBER_FONTS.map((f) => {
          const active = numFont === f.id;
          return (
            <button
              key={f.id}
              type="button"
              disabled={saving}
              onClick={() => {
                setNumFont(f.id);
                void save("font_number", f.id);
              }}
              className="rounded-md px-3 py-2 text-sm"
              style={{
                border: active ? "2px solid var(--stitch)" : "1px solid var(--border-primary)",
                background: active ? "rgba(0,0,0,0.03)" : "#fff",
              }}
            >
              <span style={{ fontWeight: 700 }}>+48</span>{" "}
              <span className="text-xs text-gray-600">{f.name}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded px-4 py-2 text-sm font-bold text-white"
        style={{ background: "var(--stitch)" }}
      >
        サイトに適用（リロード）
      </button>
    </section>
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
            管理画面
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
            権限がありません
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            このアカウントには管理権限がありません。
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
          管理画面
        </h1>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {firebaseUser.email}
        </span>
      </div>
      <SiteThemeAdmin />
      <SeasonManager />
      <UserManager />
      <SeedImporter />
      <StandingsUpdater />
    </div>
  );
}
