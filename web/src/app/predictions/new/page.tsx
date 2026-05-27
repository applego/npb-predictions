"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Season } from "@/lib/types";
import { LEAGUE_LABELS, TITLE_CATEGORY_LABELS } from "@/lib/types";
import { getTeamsByLeague, getTeamByName } from "@/lib/teams";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { PlayerCombobox } from "@/components/PlayerCombobox";

// Source of truth: lib/teams.ts. Using canonical full names guarantees that
// stored ranking_picks.team_name matches actual_team_standings.team_name from
// the npb.jp scraper, so scoring lookups stay 1:1.
const CENTRAL_TEAMS = getTeamsByLeague("central").map((t) => t.name);
const PACIFIC_TEAMS = getTeamsByLeague("pacific").map((t) => t.name);

const TITLE_CATEGORIES = Object.keys(TITLE_CATEGORY_LABELS) as Array<
  keyof typeof TITLE_CATEGORY_LABELS
>;
const LEAGUES = ["central", "pacific"] as const;

interface RankingState {
  central: string[];
  pacific: string[];
}

interface TitleState {
  central: Record<string, { playerName: string; teamName: string }>;
  pacific: Record<string, { playerName: string; teamName: string }>;
}

function initRankings(): RankingState {
  // DnD 版では空ではなく全チームを初期表示してドラッグで並び替える
  return {
    central: [...CENTRAL_TEAMS],
    pacific: [...PACIFIC_TEAMS],
  };
}

function initTitles(): TitleState {
  const empty = () =>
    Object.fromEntries(
      TITLE_CATEGORIES.map((cat) => [cat, { playerName: "", teamName: "" }])
    );
  return { central: empty(), pacific: empty() };
}

function RankingPicker({
  league,
  teams,
  rankings,
  onChange,
}: {
  league: "central" | "pacific";
  teams: string[];
  rankings: string[];
  onChange: (league: "central" | "pacific", rank: number, team: string) => void;
}) {
  // 2026-05-25: 仕様書 (UX_DESIGN.md:441, PRODUCT_AUDIT.md:43) 通りの DnD
  // 並び替え UI。dropdown 6 個ポチポチ UX を廃止、チームカードを縦に
  // ドラッグして順位を決める。1位=上、6位=下。
  // teams prop は使わず、rankings 配列 (全 6 チーム入り) を SortableContext
  // に渡す。並び替え後、各 rank に対応するチーム名を onChange で親に通知。
  void teams;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = rankings.indexOf(String(active.id));
    const newIdx = rankings.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(rankings, oldIdx, newIdx);
    // Re-emit each rank position to parent
    reordered.forEach((team, i) => {
      if (rankings[i] !== team) onChange(league, i + 1, team);
    });
  }

  return (
    <div>
      <p className="mb-3 text-xs" style={{ color: "var(--text-muted)" }}>
        🖐 ドラッグして並び替え (上から 1 位 → 6 位)
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={rankings} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {rankings.map((team, idx) => (
              <SortableTeamCard
                key={team}
                team={team}
                rank={idx + 1}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableTeamCard({ team, rank }: { team: string; rank: number }) {
  const meta = getTeamByName(team);
  const bgColor = meta?.color ?? "#6b7280";
  const textColor = meta?.textColor ?? "#fff";
  const isTop3 = rank <= 3;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: team });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : 0,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex touch-none select-none items-center gap-3 rounded-md border bg-white p-3 shadow-sm ${
        isDragging ? "ring-2 ring-offset-1" : ""
      }`}
    >
      {/* Drag handle */}
      <button
        type="button"
        aria-label={`${team} を並び替え`}
        {...attributes}
        {...listeners}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        ⋮⋮
      </button>

      {/* Rank badge */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black"
        style={{
          background: isTop3 ? "#DC2626" : "#E5E5E5",
          color: isTop3 ? "#fff" : "#737373",
        }}
      >
        {rank}
      </div>

      {/* Team badge */}
      <div
        className="flex flex-1 items-center rounded px-3 py-1.5 text-sm font-bold"
        style={{
          background: bgColor,
          color: textColor,
          textShadow: textColor === "#fff" ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
        }}
      >
        {team}
      </div>
    </li>
  );
}

function TitlePicker({
  league,
  teams,
  titles,
  onChange,
}: {
  league: "central" | "pacific";
  teams: string[];
  titles: Record<string, { playerName: string; teamName: string }>;
  onChange: (
    league: "central" | "pacific",
    cat: string,
    field: "playerName" | "teamName",
    value: string
  ) => void;
}) {
  return (
    <div className="space-y-4">
      {TITLE_CATEGORIES.map((cat) => {
        const pick = titles[cat] ?? { playerName: "", teamName: "" };
        return (
          <div key={cat} className="rounded border border-gray-200 bg-gray-50 p-3">
            <p className="mb-2 text-sm font-semibold text-gray-700">
              {TITLE_CATEGORY_LABELS[cat]}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {/* チーム select を先に: 選手 combobox の絞り込み source */}
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  所属チーム
                </label>
                <select
                  value={pick.teamName}
                  onChange={(e) =>
                    onChange(league, cat, "teamName", e.target.value)
                  }
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">— 選択 —</option>
                  {teams.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  選手名 (DB から候補表示)
                </label>
                <PlayerCombobox
                  value={pick.playerName}
                  team={pick.teamName || undefined}
                  onChange={(v) =>
                    onChange(league, cat, "playerName", v)
                  }
                  placeholder="例: 大谷翔平"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function NewPredictionPage() {
  const router = useRouter();
  const { firebaseUser, appUser, loading: authLoading, signIn } = useAuth();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState<number | "">("");
  const [rankings, setRankings] = useState<RankingState>(initRankings());
  const [titles, setTitles] = useState<TitleState>(initTitles());
  const [submitting, setSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    fetch("/api/seasons")
      .then((r) => r.json() as Promise<Season[]>)
      .then((s) => {
        setSeasons(s);
        const active = s.find((season) => season.isActive);
        if (active) setSeasonId(active.id);
        setIsLoadingData(false);
      })
      .catch(() => setIsLoadingData(false));
  }, []);

  function handleRankingChange(
    league: "central" | "pacific",
    rank: number,
    team: string
  ) {
    setRankings((prev) => {
      const next = { ...prev, [league]: [...prev[league]] };
      next[league][rank - 1] = team;
      return next;
    });
  }

  function handleTitleChange(
    league: "central" | "pacific",
    cat: string,
    field: "playerName" | "teamName",
    value: string
  ) {
    setTitles((prev) => ({
      ...prev,
      [league]: {
        ...prev[league],
        [cat]: { ...prev[league][cat], [field]: value },
      },
    }));
  }

  function validateStep1() {
    if (!appUser) return "ログインユーザーが取得できませんでした";
    if (!seasonId) return "シーズンを選択してください";
    return null;
  }

  function validateStep2() {
    const centralFilled = rankings.central.every(Boolean);
    const pacificFilled = rankings.pacific.every(Boolean);
    if (!centralFilled || !pacificFilled)
      return "セ・パ両リーグの全6チームを選択してください";
    const centralUnique = new Set(rankings.central).size === 6;
    const pacificUnique = new Set(rankings.pacific).size === 6;
    if (!centralUnique || !pacificUnique)
      return "同じチームを重複して選択できません";
    return null;
  }

  function buildPayload() {
    const rankPayloads = LEAGUES.flatMap((league) =>
      rankings[league].map((teamName, i) => ({
        league,
        rank: i + 1,
        teamName,
      }))
    );
    const titlePayloads = LEAGUES.flatMap((league) =>
      TITLE_CATEGORIES.filter(
        (cat) => titles[league][cat]?.playerName
      ).map((cat) => ({
        league,
        category: cat,
        playerName: titles[league][cat].playerName,
        teamName: titles[league][cat].teamName || undefined,
      }))
    );
    return {
      seasonId: Number(seasonId),
      rankings: rankPayloads,
      titles: titlePayloads,
    };
  }

  async function handleSubmit() {
    if (!appUser) {
      setError("ログインユーザーが取得できませんでした");
      return;
    }
    const v2 = validateStep2();
    if (v2) { setError(v2); return; }
    setSubmitting(true);
    setError(null);
    try {
      const payload = JSON.stringify(buildPayload());
      let res = await fetchWithAuth("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      if (res.status === 409) {
        // Prediction already exists for this season — fall back to update.
        res = await fetchWithAuth("/api/predictions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
      }
      if (!res.ok) {
        const d = await (res.json() as Promise<{ error?: string }>).catch(
          () => ({} as { error?: string })
        );
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      router.push("/predictions");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  function nextStep() {
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
      setError(null);
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2();
      if (err) { setError(err); return; }
      setError(null);
      setStep(3);
    }
  }

  const selectedSeason = seasons.find((s) => s.id === seasonId);

  // Auth guard: redirect to login if not authenticated
  if (authLoading) {
    return (
      <div className="mx-auto max-w-2xl animate-pulse space-y-4">
        <div className="h-8 w-48 rounded" style={{ background: "var(--border-primary)" }} />
        <div className="h-4 w-64 rounded" style={{ background: "var(--border-primary)" }} />
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full text-2xl"
          style={{ background: "rgba(229,57,53,0.1)", border: "1px solid rgba(229,57,53,0.2)" }}
        >
          ⚾
        </div>
        <h1
          className="mb-3 text-xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          ログインが必要です
        </h1>
        <p
          className="mb-6 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          予想を登録するにはGoogleアカウントでログインしてください
        </p>
        <button
          onClick={signIn}
          className="rounded px-6 py-2.5 text-sm font-bold transition-all hover:opacity-90"
          style={{
            background: "rgba(229,57,53,0.15)",
            border: "1px solid rgba(229,57,53,0.3)",
            color: "var(--stitch)",
          }}
        >
          Googleでログイン
        </button>
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div className="mx-auto max-w-2xl animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="h-4 w-64 rounded bg-gray-200" />
        <div className="h-40 rounded-lg bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold">予想を登録する</h1>
      <p className="mb-6 text-sm text-gray-500">
        セ・パ両リーグの順位予想とタイトル予想を入力してください
      </p>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {([
          { n: 1, label: "基本情報" },
          { n: 2, label: "順位予想" },
          { n: 3, label: "タイトル予想" },
        ] as const).map(({ n, label }) => (
          <div key={n} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                step >= n
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {n}
            </div>
            <span
              className={`text-sm ${step >= n ? "font-medium text-gray-800" : "text-gray-400"}`}
            >
              {label}
            </span>
            {n < 3 && <div className="h-px w-6 bg-gray-300" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1: User & Season */}
      {step === 1 && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">基本情報</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                ユーザー
              </label>
              <div className="flex items-center gap-3 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                {appUser?.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={appUser.avatarUrl}
                    alt=""
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <span className="font-medium text-gray-800">
                  {appUser?.name ?? "（取得中...）"}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                ログイン中のアカウントで予想を登録します
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                シーズン <span className="text-red-500">*</span>
              </label>
              <select
                value={seasonId}
                onChange={(e) =>
                  setSeasonId(e.target.value ? Number(e.target.value) : "")
                }
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">— 選択してください —</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                    {s.isActive ? " (現在)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Rankings */}
      {step === 2 && (
        <div className="space-y-6">
          {LEAGUES.map((league) => (
            <div key={league} className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">
                {LEAGUE_LABELS[league]} 順位予想
              </h2>
              <RankingPicker
                league={league}
                teams={league === "central" ? CENTRAL_TEAMS : PACIFIC_TEAMS}
                rankings={rankings[league]}
                onChange={handleRankingChange}
              />
            </div>
          ))}
        </div>
      )}

      {/* Step 3: Title picks */}
      {step === 3 && (
        <div className="space-y-6">
          {LEAGUES.map((league) => (
            <div key={league} className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">
                {LEAGUE_LABELS[league]} タイトル予想
              </h2>
              <TitlePicker
                league={league}
                teams={league === "central" ? CENTRAL_TEAMS : PACIFIC_TEAMS}
                titles={titles[league]}
                onChange={handleTitleChange}
              />
            </div>
          ))}

          {/* Summary */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="mb-1 text-sm font-semibold text-blue-800">
              確認: {appUser?.name} さんの予想
            </p>
            <p className="text-sm text-blue-700">
              {selectedSeason?.label} — 順位予想 12項目 + タイトル予想{" "}
              {LEAGUES.flatMap((l) =>
                TITLE_CATEGORIES.filter((c) => titles[l][c]?.playerName)
              ).length}
              /{TITLE_CATEGORIES.length * 2} 項目入力済み
            </p>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (step > 1) setStep((step - 1) as 1 | 2 | 3);
            else router.back();
          }}
          className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {step === 1 ? "キャンセル" : "← 戻る"}
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={nextStep}
            className="rounded bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            次へ →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded bg-green-600 px-6 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? "登録中..." : "予想を登録する ✓"}
          </button>
        )}
      </div>
    </div>
  );
}
