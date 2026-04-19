import type { BreadcrumbItem } from "./Breadcrumb";
import { absoluteUrl, SEO_TERMS } from "@/lib/seo-meta";

function JsonLdScript({ data }: { data: unknown }) {
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
      ...(item.href ? { item: absoluteUrl(item.href) } : {}),
    })),
  };

  return <JsonLdScript data={jsonLd} />;
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

  return <JsonLdScript data={jsonLd} />;
}

/**
 * Website-level JSON-LD. Place once in the root layout.
 */
export function WebsiteJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SEO_TERMS.site,
    alternateName: SEO_TERMS.tagline,
    url: absoluteUrl("/"),
    inLanguage: "ja-JP",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/rankings/commentators")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
  return <JsonLdScript data={jsonLd} />;
}

/**
 * Person JSON-LD for commentator detail pages.
 */
export function PersonJsonLd({
  name,
  pathname,
  description,
  image,
  knowsAbout = "Nippon Professional Baseball",
  sameAs,
}: {
  name: string;
  pathname: string;
  description?: string;
  image?: string;
  knowsAbout?: string;
  sameAs?: string[];
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url: absoluteUrl(pathname),
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
    knowsAbout,
    ...(sameAs && sameAs.length > 0 ? { sameAs } : {}),
  };
  return <JsonLdScript data={jsonLd} />;
}

/**
 * NewsArticle JSON-LD for news-style pages.
 */
export function NewsArticleJsonLd({
  headline,
  description,
  pathname,
  datePublished,
  dateModified,
  image,
  authorName = SEO_TERMS.site,
}: {
  headline: string;
  description: string;
  pathname: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
  authorName?: string;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline,
    description,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(pathname),
    },
    datePublished,
    dateModified: dateModified ?? datePublished,
    inLanguage: "ja-JP",
    ...(image ? { image: [image] } : {}),
    author: { "@type": "Organization", name: authorName },
    publisher: {
      "@type": "Organization",
      name: SEO_TERMS.site,
      url: absoluteUrl("/"),
    },
  };
  return <JsonLdScript data={jsonLd} />;
}

/**
 * SportsEvent JSON-LD for season result / scoreboard pages.
 */
export function SportsEventJsonLd({
  year,
  league,
  pathname,
  description,
  startDate,
  endDate,
}: {
  year: number;
  league?: "central" | "pacific" | "both";
  pathname: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}) {
  const leagueName =
    league === "central"
      ? SEO_TERMS.central
      : league === "pacific"
        ? SEO_TERMS.pacific
        : SEO_TERMS.bothLeagues;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${year}年 ${leagueName} シーズン`,
    sport: "Baseball",
    url: absoluteUrl(pathname),
    startDate: startDate ?? `${year}-03-01`,
    endDate: endDate ?? `${year}-11-30`,
    inLanguage: "ja-JP",
    ...(description ? { description } : {}),
    location: {
      "@type": "Country",
      name: "Japan",
    },
    organizer: {
      "@type": "Organization",
      name: "Nippon Professional Baseball",
    },
  };
  return <JsonLdScript data={jsonLd} />;
}
