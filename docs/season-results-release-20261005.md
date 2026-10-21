# Season-result UI release — 2026-10-05

## User outcome

Turn season-end interest into a readable, guest-accessible answer: who matched the
standings, which teams differed, and where the original prediction came from.
The acquisition landing page is `/`; `/rankings?year=2026&league=central` (or
`pacific`, `all`) is the complete, shareable results surface. No fabricated PV,
perfect-prediction counts, or historic records are displayed.

## Implemented scope

- Replace the home-page fixed `BEST_SCORE = 44` and registration-first CTA with
  source-backed results, observed exact-match counts, league/year navigation,
  data freshness, explicit unavailable states, and official standings links.
- Replace the rankings portal with the complete searchable answer sheet.
  Native expandable rows compare each predicted team with its actual rank.
- Add contextual, user-initiated share/copy with truthful failure handling and
  a direct predictor fragment that opens the relevant row.
- Refresh the shared header, mobile primary navigation, footer and secondary
  page shell. Keep existing prediction forms, locking, auth, point scoring,
  detailed matrix, title, group and admin routes intact and reachable.
- Read only locked commentator predictions through an explicit public column
  projection. Do not serialize emails, Firebase identifiers or private drafts.
- Require six distinct teams and ranks from one complete latest snapshot for
  each league. Never merge partial snapshots or infer finality from the date or
  season activity. Both leagues are required for the combined view. Equal
  comparisons share a rank. Variant selection happens before result evaluation.
- Existing point scores are unchanged: this new list orders exact matches, then
  total absolute rank deviation, and explicitly links to the point scoreboard.

## Sources and finality

User-supplied article: https://matomelotte.com/archives/60085895.html
Official Central: https://npb.jp/bis/2026/stats/std_c.html
Official Pacific: https://npb.jp/bis/2026/stats/std_p.html

The linked article's 141-person population and named winner are NOT imported or
presented as verified site data. Its article, images and comments are not copied.
An October 4 observation does not establish that all ranks in both leagues are
final. Website data is evaluated independently. `isFinal` must be set by the
existing authorized result ingestion/finalization process, not by this UI.

## Validation performed in the authoring environment

- 20 pure integrity/query cases passed via TypeScript transpilation and the Node
  test runner adapter, using the same cases checked in for Vitest.
- Strict TypeScript checking passed for the pure result/query modules against a
  local team-master projection matching the fetched repository data.
- Syntax checking passed for all 13 changed TypeScript/TSX files.
- Changed TSX was rendered with a static JSX adapter and explicitly fictional
  fixtures. Chromium/Playwright layout checks at 320, 390 and 1440px found no
  document-width overflow before or after opening six-team comparisons.
- Those static checks are NOT React hydration, Next.js, Cloudflare, live-data or
  authenticated-flow verification. The normal npm dependency install could not
  run in the isolated authoring environment (outbound DNS unavailable).
- Seven new Playwright cases are committed for the actual existing CI runtime:
  seeded-data rendering, league URL navigation, search/comparison, denied
  clipboard fallback, and three responsive widths. No skipped or conditional
  pass fallback was added.

## Must pass before production release

1. Review the latest PR head; full npm test, Next build, Cloudflare build,
   performance/data gates and the complete existing + new Playwright suite.
2. Check screenshots from the real app, including guest, signed-in long names,
   keyboard navigation, search, share cancellation, no-data, stale data and
   complete-final fixtures. Verify all existing forms and matrix routes.
3. Fetch the public site and actual data update timestamps. Confirm official
   standings against the site's six rows and check public source links.
   No production data was read directly or changed in this task.
4. Inspect actual OG images on a shared URL. Confirm canonical domain and
   Search Console indexing. The existing image generation pipeline is retained;
   this change does not claim a new data-specific image has been deployed.
5. Use the established reviewed merge/deploy path, not a direct database edit or
   manual production deploy. Check the deployed commit and render afterwards.

## Measure the outcome, not the diff size

Before announcing, establish actual baseline traffic from existing Cloudflare
analytics/Search Console. Record organic impressions, search clicks, landing
page visits, results-page visits and repeat visits for 7 days before/after the
release. Changes in seasonal demand confound a simple before/after comparison;
do not attribute all growth to the UI. Social-share clicks are not successful
posts, and button success is not proof of incoming traffic. No new tracker,
external integration, ad spend, or invented measurement is added here.

Remaining: production data freshness/finality, live CI/build and browser release
gates, deployed-head verification, OG/canonical checks and measured acquisition.
The shared shell and primary results journey are refreshed; unrelated detailed
feature screens are not falsely claimed to have each been individually redesigned.
