/**
 * Article Templates v2 — with humor, timing-awareness, and richer variables.
 *
 * Variables available:
 * - {name}          ユーザー名
 * - {year}          年
 * - {central1}      セ1位予想
 * - {pacific1}      パ1位予想
 * - {boldness}      大胆さラベル
 * - {timing}        投稿時期ラベル
 * - {timingBonus}   時期補正（×1.0 など）
 * - {consensus}     合意度ラベル
 * - {popularPick}   最多予想チーム（セ）
 * - {popularPct}    最多予想の%
 * - {lastYearC1}    去年のセ1位実績
 * - {lastYearP1}    去年のパ1位実績
 * - {c1LastRank}    予想1位チームの去年順位
 * - {daysContext}    開幕との日数コンテキスト
 * - {month}         投稿月
 */

export interface ArticleVarsV2 {
  name: string;
  year: number;
  central1: string;
  pacific1: string;
  boldness: string;
  timing: string;
  timingBonus: string;
  consensus: string;
  popularPick: string;
  popularPct: number;
  lastYearC1: string;
  lastYearP1: string;
  c1LastRank: number;
  daysContext: string;
  month: number;
}

export interface ArticleV2 {
  id: string;
  /** Conditions for this template to be selected */
  condition: (v: ArticleVarsV2) => boolean;
  headline: string;
  subtext: string;
}

const TEMPLATES: ArticleV2[] = [
  // ── 遅刻パターン ──
  {
    id: "late-arrival",
    condition: (v) => v.month >= 5,
    headline: "え、まだ予想してなかったの？ {name}氏がようやく{year}年予想を提出",
    subtext: "{timing} — {timingBonus}のハンデ付き。{central1}優勝に賭ける",
  },
  {
    id: "super-late",
    condition: (v) => v.month >= 8,
    headline: "もう{month}月ですよ？ {name}氏、今さら順位予想を投稿",
    subtext: "補正{timingBonus}のペナルティ覚悟で{central1}と{pacific1}を指名",
  },

  // ── 大穴パターン ──
  {
    id: "upset-mega",
    condition: (v) => v.c1LastRank >= 5,
    headline: "去年{c1LastRank}位の{central1}を優勝予想!? {name}氏の超大穴",
    subtext: "{boldness}の予想 — 解説者{popularPct}%は{popularPick}を支持する中で",
  },
  {
    id: "against-everyone",
    condition: (v) => v.popularPct >= 50,
    headline: "{popularPct}%が{popularPick}予想の中、{name}氏だけ{central1}",
    subtext: "{consensus} — {boldness}の選択に注目が集まる",
  },

  // ── 堅実パターン ──
  {
    id: "safe-boring",
    condition: (v) => v.boldness === "堅実派",
    headline: "面白みゼロ？ {name}氏、解説者多数派とほぼ同じ予想を提出",
    subtext: "{consensus}。手堅くスコアを狙う戦略か — {timing}",
  },
  {
    id: "copycat",
    condition: (v) => v.boldness === "堅実派" && v.popularPct >= 60,
    headline: "{name}氏「{popularPick}優勝は誰でもわかる」",
    subtext: "多数派に乗る堅実路線 — 問題はパ・リーグの{pacific1}予想だ",
  },

  // ── 連覇予想パターン ──
  {
    id: "repeat-champ",
    condition: (v) => v.central1 === v.lastYearC1,
    headline: "{name}氏、{central1}の連覇を予想！",
    subtext: "去年王者をそのまま1位指名 — {timing}の{boldness}",
  },
  {
    id: "new-champ",
    condition: (v) => v.central1 !== v.lastYearC1 && v.c1LastRank <= 3,
    headline: "王座交代？ {name}氏が{central1}のセ制覇を予想",
    subtext: "去年{c1LastRank}位からの逆転を期待 — {consensus}",
  },

  // ── 開幕前パターン ──
  {
    id: "preseason-hype",
    condition: (v) => v.month <= 3,
    headline: "開幕前速報！ {name}氏の{year}年大予想",
    subtext: "セ・{central1}、パ・{pacific1}でV宣言。{boldness}の分析 — 補正なしの真剣勝負",
  },
  {
    id: "preseason-analysis",
    condition: (v) => v.month <= 3,
    headline: "【{year}年展望】{name}氏がペナントを占う",
    subtext: "{central1}と{pacific1}を本命視。{consensus}",
  },

  // ── 汎用パターン ──
  {
    id: "standard-dual",
    condition: () => true,
    headline: "{name}氏、{year}年は{central1}と{pacific1}で勝負！",
    subtext: "{boldness}の順位予想 — {timing}に{timingBonus}で参戦",
  },
  {
    id: "declaration",
    condition: () => true,
    headline: "ここに宣言！{name}氏「{central1}が{year}年の覇者だ」",
    subtext: "パは{pacific1}を指名 — {consensus}",
  },
  {
    id: "challenge",
    condition: () => true,
    headline: "{name}氏が{year}年予想リーグに参戦！",
    subtext: "セ・{central1}、パ・{pacific1}の予想で解説者{popularPct}%に挑む",
  },
  {
    id: "data-nerd",
    condition: () => true,
    headline: "数字で見る{year}年 — {name}氏の冷徹な順位予想",
    subtext: "{timing}の投稿 — {boldness}。{central1}×{pacific1}の組み合わせは吉と出るか",
  },
  {
    id: "passion-pick",
    condition: () => true,
    headline: "熱き予想公開！ {name}氏の{year}年ペナント展望",
    subtext: "本命{central1}、パは{pacific1}。{consensus}の予想を{timingBonus}で提出",
  },
];

/**
 * Select template: prefer condition-matching templates, fall back to universal.
 * Deterministic based on userId + year.
 */
export function selectTemplateV2(userId: number, year: number, vars: ArticleVarsV2): ArticleV2 {
  const matching = TEMPLATES.filter((t) => t.condition(vars));
  const hash = Math.abs((userId * 31 + year * 17) % matching.length);
  return matching[hash];
}

/**
 * Render template by replacing all {var} placeholders.
 */
export function renderTemplateV2(
  template: ArticleV2,
  vars: ArticleVarsV2,
): { headline: string; subtext: string } {
  const replace = (text: string): string =>
    text
      .replace(/\{name\}/g, vars.name)
      .replace(/\{year\}/g, String(vars.year))
      .replace(/\{central1\}/g, vars.central1)
      .replace(/\{pacific1\}/g, vars.pacific1)
      .replace(/\{boldness\}/g, vars.boldness)
      .replace(/\{timing\}/g, vars.timing)
      .replace(/\{timingBonus\}/g, vars.timingBonus)
      .replace(/\{consensus\}/g, vars.consensus)
      .replace(/\{popularPick\}/g, vars.popularPick)
      .replace(/\{popularPct\}/g, String(vars.popularPct))
      .replace(/\{lastYearC1\}/g, vars.lastYearC1)
      .replace(/\{lastYearP1\}/g, vars.lastYearP1)
      .replace(/\{c1LastRank\}/g, String(vars.c1LastRank))
      .replace(/\{daysContext\}/g, vars.daysContext)
      .replace(/\{month\}/g, String(vars.month));

  return {
    headline: replace(template.headline),
    subtext: replace(template.subtext),
  };
}

/**
 * Generate article with automatic template selection.
 */
export function generateArticleV2(
  userId: number,
  vars: ArticleVarsV2,
): { headline: string; subtext: string; templateId: string } {
  const template = selectTemplateV2(userId, vars.year, vars);
  const rendered = renderTemplateV2(template, vars);
  return { ...rendered, templateId: template.id };
}
