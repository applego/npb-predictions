/**
 * Article Templates v3 — Full newspaper-style articles.
 * Each template has: headline, lead, body paragraphs, quote.
 */

import { computeBoldness, getBoldnessLabel, getTimingLabel, getConsensusLabel } from "./article-templates";

export interface ArticleVarsV3 {
  name: string;
  year: number;
  central: string[];  // guaranteed 6 elements (padded with "---")
  pacific: string[];  // guaranteed 6 elements (padded with "---")
  boldness: string;
  timing: string;
  consensus: string;
  popularPick: string;
  popularPct: number;
  totalPredictors: number;
  samePredPct: number;
  source: string;
}

/** Ensure array has exactly 6 elements */
function pad6(arr: string[]): string[] {
  const result = [...arr];
  while (result.length < 6) result.push("---");
  return result.slice(0, 6);
}

export interface FullArticle {
  headline: string;
  lead: string;
  body: string[];
  quote: string;
}

interface Template {
  id: string;
  condition: (v: ArticleVarsV3) => boolean;
  render: (v: ArticleVarsV3) => FullArticle;
}

const TEMPLATES: Template[] = [
  // ── 大穴型 ──
  {
    id: "dark-horse",
    condition: (v) => v.samePredPct < 10,
    render: (v) => ({
      headline: `独自路線！ ${v.name}氏が${v.central[0]}V予想`,
      lead: `${v.name}氏が${v.year}年のセ・リーグは${v.central[0]}が優勝するとの大胆な見解を示した。解説者${v.totalPredictors}人中、同様の予想はわずか${v.samePredPct}%という少数派だ。`,
      body: [
        `${v.name}氏のセ・リーグ予想は1位${v.central[0]}、2位${v.central[1]}、3位${v.central[2]}。パ・リーグは${v.pacific[0]}を本命に指名した。${v.boldness}の予想として注目を集めている。`,
        `解説者${v.totalPredictors}人の予想を集計すると、セ1位に${v.popularPick}を推す声が${v.popularPct}%と最多。${v.central[0]}を1位に予想したのは全体のわずか${v.samePredPct}%にとどまる。`,
        `${v.timing}での投稿となった${v.name}氏。過去の的中実績が問われる大胆な予想だが、${v.central[0]}ファンには心強い援軍となりそうだ。`,
      ],
      quote: `「${v.central[0]}には今年、勝てる要素が揃っている。周りが何と言おうと、私は${v.central[0]}を推す」と${v.name}氏は力を込めた。`,
    }),
  },
  // ── 多数派一致型 ──
  {
    id: "consensus",
    condition: (v) => v.samePredPct >= 30,
    render: (v) => ({
      headline: `${v.name}氏も${v.central[0]}優勝を予想`,
      lead: `${v.name}氏が${v.year}年順位予想を発表。セ・リーグは${v.central[0]}を1位に指名し、解説者の多数派と足並みを揃えた。`,
      body: [
        `セ・リーグは1位${v.central[0]}、2位${v.central[1]}、3位${v.central[2]}、4位${v.central[3]}、5位${v.central[4]}、6位${v.central[5]}。パ・リーグは${v.pacific[0]}を本命とした。`,
        `${v.central[0]}を1位に予想した解説者は全体の${v.popularPct}%。${v.name}氏は${v.consensus}で、手堅いスコアを狙う戦略と見られる。`,
        `注目はパ・リーグの予想だ。${v.pacific[0]}を1位に据え、2位に${v.pacific[1]}を指名。セは堅実だがパの順位に${v.name}氏の個性が光る。`,
      ],
      quote: `「${v.central[0]}の戦力は頭一つ抜けている。問題はパ・リーグ。${v.pacific[0]}と${v.pacific[1]}の差は紙一重だ」と${v.name}氏は分析した。`,
    }),
  },
  // ── 遅刻型 ──
  {
    id: "late-entry",
    condition: (v) => v.timing.includes("序盤") || v.timing.includes("後半") || v.timing.includes("終盤"),
    render: (v) => ({
      headline: `今さら参戦！ ${v.name}氏が順位予想を投稿`,
      lead: `${v.timing}での投稿。${v.name}氏がようやく${v.year}年の順位予想をNPB予想リーグに提出した。`,
      body: [
        `${v.name}氏の予想はセ・リーグ1位${v.central[0]}、パ・リーグ1位${v.pacific[0]}。${v.timing}での投稿のため、開幕前組と比べて情報面でのアドバンテージがある反面、時期補正によるスコアペナルティを受ける。`,
        `「なぜ今？」という疑問に対し、${v.name}氏は開幕後の戦力分析を踏まえた上での予想だと主張している模様。解説者${v.totalPredictors}人の大半が開幕前に投稿する中、異色の存在だ。`,
        `セ・リーグでは${v.central[0]}を本命視。${v.popularPick}を推す声が${v.popularPct}%の中、${v.name}氏の選択が吉と出るか凶と出るか。`,
      ],
      quote: `「遅くなったが、その分しっかり見極めた。${v.central[0]}は開幕から調子がいい」と${v.name}氏。だが時期補正のハンデは重い。`,
    }),
  },
  // ── 連覇予想型 ──
  {
    id: "repeat-champion",
    condition: () => true,
    render: (v) => ({
      headline: `${v.name}氏、${v.central[0]}のV${v.year > 2025 ? "奪回" : ""}を予想`,
      lead: `${v.name}氏が${v.year}年プロ野球の順位予想を発表。セは${v.central[0]}、パは${v.pacific[0]}の優勝を予想した。${v.source ? `（${v.source}）` : ""}`,
      body: [
        `${v.name}氏が描く${v.year}年のペナント展望。セ・リーグは${v.central[0]}を筆頭に、${v.central[1]}、${v.central[2]}と続く。パ・リーグは${v.pacific[0]}が頭一つ抜け、${v.pacific[1]}、${v.pacific[2]}が追う展開を予想した。`,
        `今回の予想は${v.boldness}と評される。解説者${v.totalPredictors}人の予想を集計すると、${v.popularPick}を1位に推す声が${v.popularPct}%。${v.name}氏は${v.consensus}の立場だ。`,
        `Bクラス予想となった${v.central[4]}、${v.central[5]}のファンにとっては厳しい見立てだが、${v.name}氏は「戦力差は小さい。順位予想は紙一重の差で決まる」と語る。`,
        `パ・リーグでは${v.pacific[5]}を最下位に予想。「${v.pacific[0]}の投手力は12球団随一」と${v.pacific[0]}の優位を強調した。`,
      ],
      quote: `「${v.central[0]}と${v.pacific[0]}、この2チームは戦力が充実している。自信を持って言える」と${v.name}氏は断言した。`,
    }),
  },
  // ── シンプル汎用型 ──
  {
    id: "standard",
    condition: () => true,
    render: (v) => ({
      headline: `${v.name}氏が${v.year}年順位予想を発表`,
      lead: `${v.name}氏がNPB予想リーグに${v.year}年の順位予想を投稿した。セは${v.central[0]}、パは${v.pacific[0]}を本命に指名。${v.timing}。`,
      body: [
        `セ・リーグの予想は、${v.central.map((t, i) => `${i + 1}位${t}`).join("、")}。パ・リーグは${v.pacific.map((t, i) => `${i + 1}位${t}`).join("、")}とした。`,
        `${v.name}氏の予想は${v.boldness}。解説者${v.totalPredictors}人中、${v.central[0]}を1位に予想した割合は${v.samePredPct}%で、${v.consensus}の予想となっている。`,
      ],
      quote: `「${v.year}年も白熱したペナントレースを期待している」と${v.name}氏は語った。`,
    }),
  },
];

/** Select and render a full article */
export function generateFullArticle(userId: number, vars: ArticleVarsV3): FullArticle & { templateId: string } {
  const matching = TEMPLATES.filter((t) => t.condition(vars));
  const hash = Math.abs((userId * 31 + vars.year * 17) % matching.length);
  const template = matching[hash];
  return { ...template.render(vars), templateId: template.id };
}

/** Helper: build ArticleVarsV3 from raw data */
export function buildArticleVars(
  name: string,
  year: number,
  central: string[],
  pacific: string[],
  allC1s: string[],
  allP1s: string[],
  source: string | null,
): ArticleVarsV3 {
  const c1 = central[0] ?? "???";
  const p1 = pacific[0] ?? "???";
  const boldnessLevel = computeBoldness(c1, p1, allC1s, allP1s);
  const popularC = modeStr(allC1s);
  const popularPct = allC1s.length > 0
    ? Math.round((allC1s.filter((t) => t === popularC).length / allC1s.length) * 100)
    : 0;
  const samePredPct = allC1s.length > 0
    ? Math.round((allC1s.filter((t) => t === c1).length / allC1s.length) * 100)
    : 0;

  return {
    name,
    year,
    central: pad6(central),
    pacific: pad6(pacific),
    boldness: getBoldnessLabel(boldnessLevel),
    timing: getTimingLabel(3), // default to preseason
    consensus: getConsensusLabel(c1 === popularC ? 0.8 : samePredPct > 20 ? 0.4 : 0.1),
    popularPick: popularC,
    popularPct,
    totalPredictors: allC1s.length,
    samePredPct,
    source: source ?? "",
  };
}

function modeStr(arr: string[]): string {
  const freq = new Map<string, number>();
  for (const v of arr) freq.set(v, (freq.get(v) ?? 0) + 1);
  let best = "";
  let bestC = 0;
  for (const [k, c] of freq) { if (c > bestC) { best = k; bestC = c; } }
  return best;
}
