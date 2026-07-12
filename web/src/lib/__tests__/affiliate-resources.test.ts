import { afterEach, describe, expect, it } from "vitest";
import {
  AFFILIATE_DISCLOSURE,
  findAffiliateResource,
  getAffiliateResources,
} from "../affiliate-resources";

const ENV_KEYS = [
  "AFFILIATE_SCOREBOOK_URL",
  "AFFILIATE_NPB_BOOKS_URL",
  "AFFILIATE_STREAMING_URL",
  "AFFILIATE_FAN_GEAR_URL",
  "NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG",
];
const ORIGINAL_ENV = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = ORIGINAL_ENV.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("affiliate resources", () => {
  it("keeps a visible advertising disclosure", () => {
    expect(AFFILIATE_DISCLOSURE).toContain("広告");
    expect(AFFILIATE_DISCLOSURE).toContain("紹介料");
  });

  it("returns unique, allowlisted https resources", () => {
    const resources = getAffiliateResources();
    expect(resources.length).toBeGreaterThan(0);
    expect(new Set(resources.map((resource) => resource.id)).size).toBe(
      resources.length,
    );

    for (const resource of resources) {
      expect(resource.href).toMatch(/^https:\/\//);
      expect(resource.title.length).toBeGreaterThan(0);
      expect(resource.description.length).toBeGreaterThan(0);
      expect(findAffiliateResource(resource.id, resource.href)).toEqual(resource);
    }
  });

  it("turns configured exact urls into monetized resources", () => {
    process.env.AFFILIATE_SCOREBOOK_URL =
      "https://example.com/scorebook?utm_source=npb";

    const scorebook = getAffiliateResources().find(
      (resource) => resource.id === "scorebook",
    );

    expect(scorebook?.href).toBe("https://example.com/scorebook?utm_source=npb");
    expect(scorebook?.monetized).toBe(true);
  });

  it("rejects invalid configured urls and keeps fallback links", () => {
    process.env.AFFILIATE_NPB_BOOKS_URL = "http://insecure.example.com/books";

    const books = getAffiliateResources().find(
      (resource) => resource.id === "npb-books",
    );

    expect(books?.href).toMatch(/^https:\/\/search\.rakuten\.co\.jp\//);
    expect(books?.monetized).toBe(false);
  });

  it("adds Amazon Associate tag only to Amazon fallback links", () => {
    process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG = "npbtest-22";

    const resources = getAffiliateResources();
    const amazonLinks = resources.filter(
      (resource) => resource.provider === "amazon",
    );
    const rakuten = resources.find((resource) => resource.provider === "rakuten");

    expect(amazonLinks.length).toBeGreaterThan(0);
    for (const resource of amazonLinks) {
      expect(resource.href).toContain("tag=npbtest-22");
      expect(resource.monetized).toBe(true);
    }
    expect(rakuten?.href).not.toContain("tag=npbtest-22");
  });
});
