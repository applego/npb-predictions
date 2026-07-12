export type AffiliateCategory = "watch" | "study" | "gear";
export type AffiliateProvider = "amazon" | "rakuten" | "moshimo" | "official";

export type AffiliateResource = {
  id: string;
  category: AffiliateCategory;
  provider: AffiliateProvider;
  title: string;
  description: string;
  href: string;
  label: string;
  monetized: boolean;
};

type ResourceConfig = {
  id: string;
  category: AffiliateCategory;
  provider: AffiliateProvider;
  title: string;
  description: string;
  label: string;
  fallbackHref: string;
  envKey?: string;
};

export const AFFILIATE_DISCLOSURE =
  "このページには広告・アフィリエイトリンクを含む場合があります。購入や登録が発生すると、運営が紹介料を受け取ることがあります。";

const RESOURCE_CONFIGS: ResourceConfig[] = [
  {
    id: "scorebook",
    category: "study",
    provider: "amazon",
    title: "スコアブック・観戦ノート",
    description:
      "順位予想の根拠を残したい人向け。試合ごとの気づきや先発ローテ、打順の変化をメモできます。",
    label: "スコアブックを探す",
    fallbackHref: "https://www.amazon.co.jp/s?k=%E9%87%8E%E7%90%83+%E3%82%B9%E3%82%B3%E3%82%A2%E3%83%96%E3%83%83%E3%82%AF",
    envKey: "AFFILIATE_SCOREBOOK_URL",
  },
  {
    id: "npb-books",
    category: "study",
    provider: "rakuten",
    title: "順位予想に役立つ野球本",
    description:
      "データ、戦術、選手名鑑をまとめて確認。予想を感覚だけで終わらせないための読み物です。",
    label: "野球本を探す",
    fallbackHref: "https://search.rakuten.co.jp/search/mall/%E3%83%97%E3%83%AD%E9%87%8E%E7%90%83+%E9%81%B8%E6%89%8B%E5%90%8D%E9%91%91/",
    envKey: "AFFILIATE_NPB_BOOKS_URL",
  },
  {
    id: "streaming",
    category: "watch",
    provider: "official",
    title: "試合を追うための配信・放送",
    description:
      "毎日の順位変動を追う人向け。公式配信や放送サービスの比較ページに差し替えられる枠です。",
    label: "視聴方法を確認する",
    fallbackHref: "https://npb.jp/",
    envKey: "AFFILIATE_STREAMING_URL",
  },
  {
    id: "fan-gear",
    category: "gear",
    provider: "amazon",
    title: "応援グッズ・観戦小物",
    description:
      "現地観戦やスポーツバー観戦の前に。チームカラーの小物や暑さ対策グッズをまとめて探せます。",
    label: "観戦グッズを探す",
    fallbackHref: "https://www.amazon.co.jp/s?k=%E3%83%97%E3%83%AD%E9%87%8E%E7%90%83+%E5%BF%9C%E6%8F%B4%E3%82%B0%E3%83%83%E3%82%BA",
    envKey: "AFFILIATE_FAN_GEAR_URL",
  },
];

function configuredUrl(envKey: string | undefined): string | null {
  if (!envKey) return null;
  const raw = process.env[envKey]?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function amazonTaggedUrl(href: string): string {
  const tag = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG?.trim();
  if (!tag) return href;
  try {
    const url = new URL(href);
    if (!url.hostname.endsWith("amazon.co.jp")) return href;
    url.searchParams.set("tag", tag);
    return url.toString();
  } catch {
    return href;
  }
}

export function getAffiliateResources(): AffiliateResource[] {
  return RESOURCE_CONFIGS.map((resource) => {
    const configured = configuredUrl(resource.envKey);
    const href =
      configured ??
      (resource.provider === "amazon"
        ? amazonTaggedUrl(resource.fallbackHref)
        : resource.fallbackHref);
    const monetized =
      Boolean(configured) ||
      (resource.provider === "amazon" &&
        href.includes("amazon.co.jp") &&
        href.includes("tag="));
    return {
      id: resource.id,
      category: resource.category,
      provider: resource.provider,
      title: resource.title,
      description: resource.description,
      label: resource.label,
      href,
      monetized,
    };
  });
}

export function findAffiliateResource(
  resourceId: string,
  href: string,
): AffiliateResource | null {
  return (
    getAffiliateResources().find(
      (resource) => resource.id === resourceId && resource.href === href,
    ) ?? null
  );
}
