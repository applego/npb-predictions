/**
 * Newspaper-style article headline templates for OGP images.
 *
 * Template variables:
 * - {name}       User display name
 * - {year}       Prediction year
 * - {central1}   Central League 1st pick
 * - {pacific1}   Pacific League 1st pick
 * - {boldness}   Deviation label from average predictions
 * - {timing}     Posting time context
 * - {consensus}  Agreement with consensus
 */

export interface ArticleTemplateVars {
  name: string;
  year: number;
  central1: string;
  pacific1: string;
  boldness: string;
  timing: string;
  consensus: string;
}

export interface ArticleTemplate {
  id: string;
  /** Short pattern name for debugging */
  label: string;
  /** Main headline (large text) */
  headline: string;
  /** Sub-headline / article body (smaller text) */
  subtext: string;
}

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

const TEMPLATES: ArticleTemplate[] = [
  {
    id: "preseason-standard",
    label: "Opening standard",
    headline: "{name}氏、{year}年は{central1}優勝を予想！",
    subtext: "{boldness}の順位予想を発表 — {timing}",
  },
  {
    id: "upset-alert",
    label: "Upset alert",
    headline: "波乱の予感？ {name}氏が{central1}セ制覇を大胆予想",
    subtext: "パは{pacific1}を指名 — {consensus}",
  },
  {
    id: "midseason-double",
    label: "Mid-season double",
    headline: "{timing}の{name}氏、ダブル優勝を予想！",
    subtext: "セ・{central1}＆パ・{pacific1}の二冠構想を描く",
  },
  {
    id: "expert-analysis",
    label: "Expert analysis",
    headline: "【独自分析】{name}氏の{year}年ペナント予想",
    subtext: "{central1}と{pacific1}を本命に — {boldness}",
  },
  {
    id: "hot-take",
    label: "Hot take",
    headline: "{name}氏の大胆予想が話題！",
    subtext: "セ・{central1}、パ・{pacific1}で{year}年を占う — {consensus}",
  },
  {
    id: "dark-horse",
    label: "Dark horse",
    headline: "ダークホース指名？ {name}氏が{central1}を推す",
    subtext: "{year}年セ・リーグに波乱含み — {boldness}",
  },
  {
    id: "consensus-match",
    label: "Consensus match",
    headline: "{name}氏、堅実路線で{central1}優勝を予想",
    subtext: "{consensus} — {timing}",
  },
  {
    id: "pacific-focus",
    label: "Pacific focus",
    headline: "パ本命は{pacific1}！ {name}氏が太鼓判",
    subtext: "セは{central1}を指名 — {year}年予想リーグ参戦",
  },
  {
    id: "seasonal-shake",
    label: "Season shake-up",
    headline: "{year}年は戦国時代？ {name}氏が持論を展開",
    subtext: "セ・{central1}、パ・{pacific1}のW優勝を予想 — {boldness}",
  },
  {
    id: "bold-strategy",
    label: "Bold strategy",
    headline: "{name}氏の{year}年戦略が光る",
    subtext: "{central1}×{pacific1}の組み合わせ — {consensus}",
  },
  {
    id: "opening-gun",
    label: "Opening gun",
    headline: "開幕前速報！{name}氏が{year}年順位を宣言",
    subtext: "セ・{central1}、パ・{pacific1}を1位に指名",
  },
  {
    id: "lone-wolf",
    label: "Lone wolf",
    headline: "独自路線を行く{name}氏、{central1}優勝を信じる",
    subtext: "{consensus} — {timing}",
  },
  {
    id: "fan-passion",
    label: "Fan passion",
    headline: "熱い予想公開！{name}氏の{year}年ペナント展望",
    subtext: "セ・{central1}、パ・{pacific1}に期待 — {boldness}",
  },
  {
    id: "data-driven",
    label: "Data driven",
    headline: "数字が語る{year}年 — {name}氏の冷静な順位予想",
    subtext: "{central1}と{pacific1}にデータの裏付け — {timing}",
  },
  {
    id: "flag-planter",
    label: "Flag planter",
    headline: "ここに宣言！{name}氏「{central1}が{year}年の覇者」",
    subtext: "パは{pacific1}を本命視 — {boldness}",
  },
];

// ---------------------------------------------------------------------------
// Boldness labels (deviation from average)
// ---------------------------------------------------------------------------

export type BoldnessLevel = "conservative" | "moderate" | "bold" | "radical";

const BOLDNESS_LABELS: Record<BoldnessLevel, string> = {
  conservative: "堅実派",
  moderate: "バランス型",
  bold: "大穴狙い",
  radical: "独自路線",
};

// ---------------------------------------------------------------------------
// Timing labels (when the prediction was posted)
// ---------------------------------------------------------------------------

export function getTimingLabel(month: number): string {
  if (month <= 3) return "開幕前の冷静な分析";
  if (month <= 5) return "序盤戦の勝負予想";
  if (month <= 7) return "交流戦後の再評価";
  if (month <= 9) return "シーズン終盤の勝負予想";
  return "シーズン振り返り予想";
}

// ---------------------------------------------------------------------------
// Consensus labels
// ---------------------------------------------------------------------------

export function getConsensusLabel(agreementRatio: number): string {
  if (agreementRatio >= 0.7) return "解説者の多数派と一致";
  if (agreementRatio >= 0.4) return "主流派にやや近い予想";
  if (agreementRatio >= 0.2) return "少数派の独自予想";
  return "全く独自の予想";
}

// ---------------------------------------------------------------------------
// Boldness scorer
// ---------------------------------------------------------------------------

/**
 * Simple boldness heuristic: how different is this user's 1st pick from the
 * most popular 1st pick across all predictions.
 *
 * @param userCentral1 - user's central 1st pick short name
 * @param userPacific1 - user's pacific 1st pick short name
 * @param allCentral1s - all users' central 1st picks (short names)
 * @param allPacific1s - all users' pacific 1st picks (short names)
 */
export function computeBoldness(
  userCentral1: string,
  userPacific1: string,
  allCentral1s: string[],
  allPacific1s: string[],
): BoldnessLevel {
  const centralMode = mode(allCentral1s);
  const pacificMode = mode(allPacific1s);

  const cMatch = userCentral1 === centralMode;
  const pMatch = userPacific1 === pacificMode;

  if (cMatch && pMatch) return "conservative";
  if (cMatch || pMatch) return "moderate";

  // Check how rare the picks are
  const cCount = allCentral1s.filter((t) => t === userCentral1).length;
  const pCount = allPacific1s.filter((t) => t === userPacific1).length;
  const totalRarity = cCount + pCount;

  if (totalRarity <= 2) return "radical";
  return "bold";
}

function mode(arr: string[]): string {
  const freq = new Map<string, number>();
  for (const v of arr) {
    freq.set(v, (freq.get(v) ?? 0) + 1);
  }
  let best = "";
  let bestCount = 0;
  for (const [k, count] of freq) {
    if (count > bestCount) {
      best = k;
      bestCount = count;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Template selection & rendering
// ---------------------------------------------------------------------------

/**
 * Select a template deterministically based on userId + year (stable per user/year pair).
 */
export function selectTemplate(userId: number, year: number): ArticleTemplate {
  const hash = (userId * 31 + year * 17) % TEMPLATES.length;
  return TEMPLATES[hash >= 0 ? hash : hash + TEMPLATES.length];
}

/**
 * Render a template by replacing {var} placeholders with values.
 */
export function renderTemplate(
  template: ArticleTemplate,
  vars: ArticleTemplateVars,
): { headline: string; subtext: string } {
  const replacer = (text: string): string =>
    text
      .replace(/\{name\}/g, vars.name)
      .replace(/\{year\}/g, String(vars.year))
      .replace(/\{central1\}/g, vars.central1)
      .replace(/\{pacific1\}/g, vars.pacific1)
      .replace(/\{boldness\}/g, vars.boldness)
      .replace(/\{timing\}/g, vars.timing)
      .replace(/\{consensus\}/g, vars.consensus);

  return {
    headline: replacer(template.headline),
    subtext: replacer(template.subtext),
  };
}

/**
 * Get the boldness label string from a BoldnessLevel.
 */
export function getBoldnessLabel(level: BoldnessLevel): string {
  return BOLDNESS_LABELS[level];
}

/**
 * Convenience: select + render in one call.
 */
export function generateArticle(
  userId: number,
  vars: ArticleTemplateVars,
): { headline: string; subtext: string } {
  const template = selectTemplate(userId, vars.year);
  return renderTemplate(template, vars);
}

export { TEMPLATES };
