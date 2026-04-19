import type { BreadcrumbItem } from "./Breadcrumb";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  "https://npb-predictions.pages.dev";

/**
 * Inline JSON-LD helper. Keeps markup safe for App Router rendering.
 */
function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: BreadcrumbItem[];
}) {
  const allItems = [{ label: "Home", href: "/" }, ...items];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: allItems.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${SITE_URL}${item.href}` } : {}),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function FaqJsonLd({ items }: { items: FaqItem[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/**
 * WebSite schema. Attach once on the site root (home page).
 */
export function WebSiteJsonLd({
  name = "NPB予想リーグ",
  description = "プロ野球順位予想リーグ — セ・パ両リーグの順位とタイトルを予想",
}: {
  name?: string;
  description?: string;
} = {}) {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name,
        alternateName: "NPB Predictions League",
        url: SITE_URL,
        description,
        inLanguage: "ja-JP",
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/seo/past-seasons`,
          "query-input": "required name=search_term_string",
        },
      }}
    />
  );
}

export interface NavItem {
  label: string;
  href: string;
}

/**
 * SiteNavigationElement list. Use on the home page to hint primary nav.
 */
export function SiteNavigationJsonLd({ items }: { items: NavItem[] }) {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: items.map((it, idx) => ({
          "@type": "SiteNavigationElement",
          position: idx + 1,
          name: it.label,
          url: `${SITE_URL}${it.href.startsWith("/") ? it.href : `/${it.href}`}`,
        })),
      }}
    />
  );
}

/**
 * Person schema — used on participant profile pages.
 */
export function PersonJsonLd({
  name,
  path,
  description,
  image,
}: {
  name: string;
  path: string;
  description?: string;
  image?: string;
}) {
  const url = `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "Person",
        name,
        url,
        ...(description ? { description } : {}),
        ...(image ? { image } : {}),
      }}
    />
  );
}

/**
 * SportsEvent schema — use on season/archive pages.
 */
export function SportsEventJsonLd({
  name,
  year,
  path,
  description,
}: {
  name: string;
  year: number;
  path: string;
  description?: string;
}) {
  const url = `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        name,
        url,
        sport: "Baseball",
        startDate: `${year}-03-01`,
        endDate: `${year}-11-30`,
        location: {
          "@type": "Country",
          name: "Japan",
        },
        organizer: {
          "@type": "Organization",
          name: "日本プロ野球（NPB）",
        },
        ...(description ? { description } : {}),
      }}
    />
  );
}
