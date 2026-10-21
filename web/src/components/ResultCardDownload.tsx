"use client";

import { useState } from "react";
import { recordGrowth } from "@/lib/growth-events";
import type { ResultEntry } from "@/lib/season-results";
import { RESULT_LABELS, type ResultScope } from "@/lib/season-results";
import { getTeamByName } from "@/lib/teams";

/** Local image only: result data never goes to an image-generation service. */
export function ResultCardDownload({ entry, year, scope, target, stateLabel, observation }: {
  entry: ResultEntry; year: number; scope: ResultScope; target: number; stateLabel: string; observation: string;
}) {
  const [message, setMessage] = useState("");
  async function save() {
    setMessage("");
    try {
      await document.fonts.ready;
      const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 900;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas unavailable");
      const font = '"Hiragino Sans", "Yu Gothic", sans-serif';
      function text(value: string, x: number, y: number, size: number, color = "#172d26", weight = 500, width = 1080) {
        ctx!.font = `${weight} ${size}px ${font}`;ctx!.fillStyle = color;
        ctx!.fillText(value, x, y, width);
      }
      ctx.fillStyle = "#faf9f5";ctx.fillRect(0, 0, 1200, 900);
      ctx.fillStyle = "#1d5838";ctx.fillRect(0,0,1200,12);
      text(`${year}年 ${RESULT_LABELS[scope]} / ${stateLabel}`,60,80,28,"#1d5838",700);
      text(entry.name,60,160,54,"#172d26",800);
      text("順位予想の答え合わせ",60,205,24,"#4d5f53");
      text(`${target}球団中 ${entry.exact}球団一致`,60,295,64,"#1d5838",800);
      text(`順位差合計 ${entry.deviation} · ${entry.rank}位（登録予想内）`,60,345,28);
      const leagues = scope === "all" ? ["central", "pacific"] as const : [scope];
      for (const [column, league] of leagues.entries()) {
        const x = 60 + column * 560;
        text(`${RESULT_LABELS[league]}       予想 → 実順位`,x,405,24,"#4d5f53",700,510);
        for (const [i, detail] of entry.details.filter((row) => row.league === league).entries()) {
          const label = `${getTeamByName(detail.teamName)?.shortName ?? detail.teamName}    ${detail.predictedRank}位 → ${detail.actualRank}位   ${detail.difference === 0 ? "一致" : `${detail.difference}位差`}`;
          text(label,x,453+i*43,27,detail.difference === 0 ? "#1d5838" : "#172d26",500,510);
        }
      }
      text(`出典：${entry.source ?? "出典情報なし"}${entry.sourceUrl ? "（原文リンクはサイトの内訳へ）" : "（原文リンク未確認）"}`,60,755,22,"#4d5f53");
      text(`集計：${observation}`,60,798,21,"#4d5f53");
      text("NPB 予想リーグ  /  npb-predictions.pages.dev",60,857,24,"#1d5838",700);
      const blob = await new Promise<Blob>((resolve,reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("encode failed")), "image/png"));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url;link.download = `npb-${year}-${scope}-${entry.userId}.png`;link.click();
      setTimeout(() => URL.revokeObjectURL(url),60_000);
      recordGrowth("card_download", year, scope);
      setMessage("結果カードを保存しました。Xの投稿に添付できます。");
    } catch { setMessage("画像を保存できませんでした。結果のリンクを共有してください。"); }
  }
  return <div className="result-card-save"><button type="button" className="result-button result-button-secondary" onClick={save}>結果カードを画像で保存 ↓</button><p role="status">{message}</p></div>;
}
