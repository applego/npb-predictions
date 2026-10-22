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
      const font = '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif';
      const ink = "#142c2b", lime = "#dafa78", muted = "#52645f";
      function text(value: string, x: number, y: number, size: number, color = ink, weight = 500, width = 1080) {
        let fitted = size;
        do { ctx!.font = `${weight} ${fitted}px ${font}`; } while (ctx!.measureText(value).width > width && --fitted > 14);
        ctx!.fillStyle = color;
        ctx!.fillText(value, x, y, width);
      }
      function panel(x: number, y: number, w: number, h: number, color: string, radius = 18) {
        ctx!.beginPath(); ctx!.roundRect(x, y, w, h, radius); ctx!.fillStyle = color; ctx!.fill();
      }
      ctx.fillStyle = "#f4f3ec";ctx.fillRect(0, 0, 1200, 900);
      ctx.fillStyle = ink;ctx.fillRect(0, 0, 1200, 342);
      // The result is the headline; no invented grade, percentage or accolade.
      text("みんなの順位予想対決",48,58,26,lime,800);
      // Right-align a measured edition label rather than squeezing it into the name.
      ctx.textAlign = "right";
      text(`${year}年 ${RESULT_LABELS[scope]}  /  ${stateLabel}`,1152,58,22,"#f4f3ec",600,580);
      ctx.textAlign = "left";
      text(entry.name,48,143,52,"#ffffff",800,700);
      text("順位予想の答え合わせ",50,184,24,"#c4d1cc",500,700);
      text(`${entry.rank}位`,50,267,46,lime,800,190);
      text(`順位差合計 ${entry.deviation}`,242,254,26,"#ffffff",700,460);
      text(`集計対象：${entry.populationLabel ?? "登録予想内"}`,50,307,22,"#c4d1cc",500,700);
      panel(820,101,332,199,lime,22);
      text(String(entry.exact),851,222,116,ink,900,170);
      text(`/ ${target}`,1010,212,45,ink,700,130);
      text("球団の順位が一致",853,266,24,ink,800,270);
      const leagues = scope === "all" ? ["central", "pacific"] as const : [scope];
      if (scope !== "all") {
        text("予想 → 実順位",48,389,23,muted,700);
        text("どの順位を読めていた？",820,389,22,muted,500,332);
        for (const [i, detail] of entry.details.filter(row => row.league === scope).entries()) {
          const x = 48 + (i % 3) * 376, y = 411 + Math.floor(i / 3) * 140;
          const hit = detail.difference === 0;
          panel(x,y,352,120,hit ? "#e6edda" : "#ffffff");
          ctx.fillStyle = hit ? "#45734c" : "#c7ccc4";ctx.fillRect(x,y+18,4,84);
          text(getTeamByName(detail.teamName)?.shortName ?? detail.teamName,x+22,y+36,26,ink,800,175);
          text(hit ? "一致" : `${detail.difference}位差`,x+236,y+35,22,hit ? "#315f36" : muted,700,95);
          text(`${detail.predictedRank}位`,x+22,y+94,37,ink,800,95);
          text("→",x+126,y+89,29,muted,500,45);
          text(`${detail.actualRank}位`,x+208,y+94,37,ink,800,115);
        }
      } else {
        for (const [column, league] of leagues.entries()) {
          const x = 48 + column * 568;
          text(`${RESULT_LABELS[league]}   予想 → 実順位`,x,385,23,muted,700,536);
          for (const [i, detail] of entry.details.filter(row => row.league === league).entries()) {
            const y = 402+i*47, hit = detail.difference === 0;
            panel(x,y,536,41,hit ? "#e6edda" : "#ffffff",7);
            text(getTeamByName(detail.teamName)?.shortName ?? detail.teamName,x+14,y+29,23,ink,700,145);
            text(`${detail.predictedRank}位 → ${detail.actualRank}位`,x+176,y+29,23,ink,600,195);
            text(hit ? "一致" : `${detail.difference}位差`,x+422,y+29,21,hit ? "#315f36" : muted,700,100);
          }
        }
      }
      // Keep provenance and observation visible, including unknown source links.
      text(`出典：${entry.source ?? "出典情報なし"}`,48,740,22,muted,500,1104);
      text(entry.sourceUrl ? "原文リンクはサイトの内訳へ" : "原文リンク未確認",48,775,20,muted,500,1104);
      text(`集計：${observation}`,48,811,20,muted,500,1104);
      ctx.fillStyle = ink;ctx.fillRect(0,838,1200,62);
      text("この予想、どう思う？",48,879,24,lime,800,560);
      ctx.textAlign = "right";
      text("npb-predictions.pages.dev",1152,878,22,"#ffffff",600,550);
      ctx.textAlign = "left";
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
