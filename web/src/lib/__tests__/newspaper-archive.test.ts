import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { archivedNewspaperPath } from "../newspaper-archive";
import { NPB_TEAMS } from "../teams";

describe("archivedNewspaperPath", () => {
  it("points every team at a real PNG in public/, so the link never needs the Worker to draw it", () => {
    for (const team of NPB_TEAMS) {
      const href = archivedNewspaperPath(team.slug);
      expect(href, team.slug).not.toBeNull();
      const file = readFileSync(path.join(process.cwd(), "public", href!));
      expect([...file.subarray(0, 4)], `${team.slug} must be a PNG`).toEqual([0x89, 0x50, 0x4e, 0x47]);
      expect(file.length, `${team.slug} must be the full newspaper, not an error body`).toBeGreaterThan(25_000);
    }
  });

  it("leaves unknown teams to the route's 404", () => {
    expect(archivedNewspaperPath("not-a-team")).toBeNull();
  });
});
