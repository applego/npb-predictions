/**
 * Article generation strategy selector.
 *
 * Current production mode:
 * 1. Template — fast, deterministic, $0, works offline.
 */

import { generateArticleV2, type ArticleVarsV2 } from "./article-templates-v2";

export interface GeneratedArticle {
  headline: string;
  subtext: string;
  mode: "template";
  templateId?: string;
}

/**
 * Generate article using deterministic templates.
 */
export async function generateArticle(
  userId: number,
  vars: ArticleVarsV2,
): Promise<GeneratedArticle> {
  const result = generateArticleV2(userId, vars);
  return {
    headline: result.headline,
    subtext: result.subtext,
    mode: "template",
    templateId: result.templateId,
  };
}

/**
 * Compatibility wrapper for callers that expect comparison-shaped output.
 */
export async function compareGenerators(
  userId: number,
  vars: ArticleVarsV2,
): Promise<{ template: GeneratedArticle; llm: GeneratedArticle | null }> {
  const template = await generateArticle(userId, vars);
  return { template, llm: null };
}
