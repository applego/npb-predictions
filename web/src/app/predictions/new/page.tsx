"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Season, User } from "@/lib/types";
import { LEAGUE_LABELS, TITLE_CATEGORY_LABELS } from "@/lib/types";

const CENTRAL_TEAMS = [
  "読売ジャイアンツ",
  "阪神タイガース",
  "横浜DeNAベイスターズ",
  "中日ドラゴンズ",
  "広島東洋カープ",
  "ヤクルトスワローズ",
];

const PACIFIC_TEAMS = [
  "福岡ソフトバンクホークス",
  "オリックス・バファローズ",
  "千葉ロッテマリーンズ",
  "東北楽天ゴールデンイーグルス",
  "埼玉西武ライオンズ",
  "北海道日本ハムファイターズ",
];

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
  return {
    central: Array(6).fill(""),
    pacific: Array(6).fill(""),
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
  const usedTeams = new Set(rankings.filter(Boolean));

  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5, 6].map((rank) => {
        const selectedTeam = rankings[rank - 1] ?? "";
        return (
          <div key={rank} className="flex items-center gap-3">
            <span className="w-8 shrink-0 text-right text-sm font-bold text-gray-500">
              {rank}位
            </span>
            <select
              value={selectedTeam}
              onChange={(e) => onChange(league, rank, e.target.value)}
              className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">— チームを選択 —</option>
              {teams.map((team) => (
                <option
                  key={team}
                  value={team}
                  disabled={usedTeams.has(team) && team !== selectedTeam}
                >
                  {team}
                  {usedTeams.has(team) && team !== selectedTeam ? " (選択済)" : ""}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
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
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  選手名
                </label>
                <input
                  type="text"
                  value={pick.playerName}
                  onChange={(e) =>
                    onChange(league, cat, "playerName", e.target.value)
                  }
                  placeholder="例: 大谷翔平"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
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
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function NewPredictionPage() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [userId, setUserId] = useState<number | "">("");
  const [seasonId, setSeasonId] = useState<number | "">("");
  const [rankings, setRankings] = useState<RankingState>(initRankings());
  const [titles, setTitles] = useState<TitleState>(initTitles());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    Promise.all([
      fetch("/api/users").then((r) => r.json() as Promise<User[]>).catch(() => []),
      fetch("/api/seasons").then((r) => r.json() as Promise<Season[]>).catch(() => []),
    ]).then(([u, s]) => {
      setUsers(u as User[]);
      setSeasons(s as Season[]);
      // Auto-select active season
      const active = (s as Season[]).find((season) => season.isActive);
      if (active) setSeasonId(active.id);
    });
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
    if (!userId) return "ユーザーを選択してください";
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
      userId: Number(userId),
      seasonId: Number(seasonId),
      rankings: rankPayloads,
      titles: titlePayloads,
    };
  }

  async function handleSubmit() {
    const v2 = validateStep2();
    if (v2) { setError(v2); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) {
        const d = await (res.json() as Promise<any>).catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      router.push("/predictions");
    } catch (e) {
      setError(String(e));
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
                ユーザー名 <span className="text-red-500">*</span>
              </label>
              <select
                value={userId}
                onChange={(e) =>
                  setUserId(e.target.value ? Number(e.target.value) : "")
                }
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">— 選択してください —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
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
              確認: {users.find((u) => u.id === userId)?.name} さんの予想
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
