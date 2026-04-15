// NPB team master data
export interface NpbTeam {
  slug: string;
  name: string;
  shortName: string;
  abbr: string; // 1-2 char abbreviation for compact matrix
  league: "central" | "pacific";
  color: string; // Primary brand color (background)
  textColor: string; // Text color on that background
}

export const NPB_TEAMS: NpbTeam[] = [
  // Central League
  { slug: "yomiuri-giants", name: "読売ジャイアンツ", shortName: "巨人", abbr: "巨", league: "central", color: "#F97316", textColor: "#fff" },
  { slug: "hanshin-tigers", name: "阪神タイガース", shortName: "阪神", abbr: "神", league: "central", color: "#FBBF24", textColor: "#1a1a1a" },
  { slug: "yokohama-baystars", name: "横浜DeNAベイスターズ", shortName: "DeNA", abbr: "De", league: "central", color: "#2563EB", textColor: "#fff" },
  { slug: "hiroshima-carp", name: "広島東洋カープ", shortName: "広島", abbr: "広", league: "central", color: "#DC2626", textColor: "#fff" },
  { slug: "chunichi-dragons", name: "中日ドラゴンズ", shortName: "中日", abbr: "中", league: "central", color: "#1E40AF", textColor: "#fff" },
  { slug: "yakult-swallows", name: "東京ヤクルトスワローズ", shortName: "ヤクルト", abbr: "ヤ", league: "central", color: "#059669", textColor: "#fff" },
  // Pacific League
  { slug: "orix-buffaloes", name: "オリックス・バファローズ", shortName: "オリックス", abbr: "オ", league: "pacific", color: "#1E3A5F", textColor: "#C8A951" },
  { slug: "softbank-hawks", name: "福岡ソフトバンクホークス", shortName: "ソフトバンク", abbr: "ソ", league: "pacific", color: "#F5D100", textColor: "#1a1a1a" },
  { slug: "lotte-marines", name: "千葉ロッテマリーンズ", shortName: "ロッテ", abbr: "ロ", league: "pacific", color: "#1a1a1a", textColor: "#fff" },
  { slug: "rakuten-eagles", name: "東北楽天ゴールデンイーグルス", shortName: "楽天", abbr: "楽", league: "pacific", color: "#B91C1C", textColor: "#fff" },
  { slug: "seibu-lions", name: "埼玉西武ライオンズ", shortName: "西武", abbr: "西", league: "pacific", color: "#1D4ED8", textColor: "#fff" },
  { slug: "nipponham-fighters", name: "北海道日本ハムファイターズ", shortName: "日本ハム", abbr: "ハ", league: "pacific", color: "#1E3A5F", textColor: "#4FB3E0" },
];

export function getTeamBySlug(slug: string): NpbTeam | undefined {
  return NPB_TEAMS.find((t) => t.slug === slug);
}

export function getTeamsByLeague(league: "central" | "pacific"): NpbTeam[] {
  return NPB_TEAMS.filter((t) => t.league === league);
}

/** Lookup team by shortName (e.g. "巨人") or name */
export function getTeamByName(name: string): NpbTeam | undefined {
  return NPB_TEAMS.find(
    (t) => t.shortName === name || t.name === name || t.abbr === name
  );
}
