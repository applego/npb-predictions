/**
 * Article generation strategy selector.
 *
 * Two modes:
 * 1. Template (default) — fast, deterministic, $0, works offline
 * 2. LLM (Gemma4 via browser WebLLM or API) — creative, varied, needs model
 *
 * For v1: template only. LLM support is scaffolded for future use.
 */

import { generateArticleV2, type ArticleVarsV2 } from "./article-templates-v2";

export type GeneratorMode = "template" | "llm";

export interface GeneratedArticle {
  headline: string;
  subtext: string;
  mode: GeneratorMode;
  templateId?: string;
}

/**
 * Generate article using the configured mode.
 * Falls back to template if LLM fails.
 */
export async function generateArticle(
  userId: number,
  vars: ArticleVarsV2,
  mode: GeneratorMode = "template",
): Promise<GeneratedArticle> {
  if (mode === "llm") {
    try {
      return await generateWithLLM(vars);
    } catch {
      // Fall back to template
    }
  }

  const result = generateArticleV2(userId, vars);
  return {
    headline: result.headline,
    subtext: result.subtext,
    mode: "template",
    templateId: result.templateId,
  };
}

/**
 * LLM-based article generation (Gemma4 via API or WebLLM).
 *
 * Future implementation options:
 * 1. Browser-side: WebLLM with Gemma 4 2B (runs in user's browser, $0)
 * 2. Server-side: Cloudflare Workers AI with @cf/google/gemma-7b-it
 * 3. External API: Google AI Studio (free tier)
 *
 * Prompt design: give the model the prediction data + context,
 * ask for a sports-newspaper headline + subtext.
 */
async function generateWithLLM(vars: ArticleVarsV2): Promise<GeneratedArticle> {
  // TODO: Implement when ready to add LLM support
  //
  // Prompt template:
  // ```
  // あなたはスポーツ新聞の見出し記者です。
  // 以下の順位予想を、面白おかしく新聞の見出し風に書いてください。
  //
  // 予想者: {name}
  // 年: {year}
  // セ・リーグ1位予想: {central1}
  // パ・リーグ1位予想: {pacific1}
  // 投稿時期: {timing} ({timingBonus})
  // 大胆さ: {boldness}
  // 解説者との一致度: {consensus}
  // 去年のセ1位: {lastYearC1}
  // 予想1位チームの去年順位: {c1LastRank}位
  // 解説者の最多予想: {popularPick} ({popularPct}%)
  //
  // 見出し（20文字以内、インパクト重視）:
  // サブテキスト（40文字以内、補足情報）:
  // ```
  //
  // Options:
  // A. WebLLM (browser-side, free):
  //    import { CreateMLCEngine } from "@mlc-ai/web-llm";
  //    const engine = await CreateMLCEngine("gemma-2-2b-it-q4f16_1-MLC");
  //    const reply = await engine.chat.completions.create({ messages: [...] });
  //
  // B. Cloudflare Workers AI:
  //    const res = await env.AI.run("@cf/google/gemma-7b-it", { prompt });
  //
  // C. Google AI Studio (free tier, 1500 req/day):
  //    const res = await fetch("https://generativelanguage.googleapis.com/v1/models/gemma-2-2b-it:generateContent", {
  //      method: "POST", headers: { "Content-Type": "application/json" },
  //      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  //    });

  throw new Error("LLM generation not yet implemented");
}

/**
 * Compare template vs LLM output for the same input (for evaluation).
 */
export async function compareGenerators(
  userId: number,
  vars: ArticleVarsV2,
): Promise<{ template: GeneratedArticle; llm: GeneratedArticle | null }> {
  const template = await generateArticle(userId, vars, "template");
  let llm: GeneratedArticle | null = null;
  try {
    llm = await generateArticle(userId, vars, "llm");
  } catch {
    // LLM not available
  }
  return { template, llm };
}
