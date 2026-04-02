// NPB team master data for SEO pages
export interface NpbTeam {
  slug: string;
  name: string;
  shortName: string;
  league: "central" | "pacific";
}

export const NPB_TEAMS: NpbTeam[] = [
  // Central League
  { slug: "yomiuri-giants", name: "読売ジャイアンツ", shortName: "巨人", league: "central" },
  { slug: "hanshin-tigers", name: "阪神タイガース", shortName: "阪神", league: "central" },
  { slug: "yokohama-baystars", name: "横浜DeNAベイスターズ", shortName: "DeNA", league: "central" },
  { slug: "hiroshima-carp", name: "広島東洋カープ", shortName: "広島", league: "central" },
  { slug: "chunichi-dragons", name: "中日ドラゴンズ", shortName: "中日", league: "central" },
  { slug: "yakult-swallows", name: "東京ヤクルトスワローズ", shortName: "ヤクルト", league: "central" },
  // Pacific League
  { slug: "orix-buffaloes", name: "オリックス・バファローズ", shortName: "オリックス", league: "pacific" },
  { slug: "softbank-hawks", name: "福岡ソフトバンクホークス", shortName: "ソフトバンク", league: "pacific" },
  { slug: "lotte-marines", name: "千葉ロッテマリーンズ", shortName: "ロッテ", league: "pacific" },
  { slug: "rakuten-eagles", name: "東北楽天ゴールデンイーグルス", shortName: "楽天", league: "pacific" },
  { slug: "seibu-lions", name: "埼玉西武ライオンズ", shortName: "西武", league: "pacific" },
  { slug: "nipponham-fighters", name: "北海道日本ハムファイターズ", shortName: "日本ハム", league: "pacific" },
];

export function getTeamBySlug(slug: string): NpbTeam | undefined {
  return NPB_TEAMS.find((t) => t.slug === slug);
}

export function getTeamsByLeague(league: "central" | "pacific"): NpbTeam[] {
  return NPB_TEAMS.filter((t) => t.league === league);
}
