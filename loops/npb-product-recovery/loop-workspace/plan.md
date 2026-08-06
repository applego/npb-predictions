# Cycle 1 — recover the core loop before monetization

## Primary persona and job

A casual NPB fan who sees an expert's preseason prediction wants to answer:
"How does that prediction compare with mine and my friends' predictions now?"
The product must make that answer available without first making the fan parse
an undifferentiated data table, a generic resource page, or a news feed.

## Canonical route map

```text
search/social -> /rankings/commentators/[slug] or /rankings/commentators
              -> /predictions/new
              -> prediction result / share card
              -> /groups?create=1 -> /groups/join?code=...
              -> /me or /rankings/scoreboard after standings update
```

- SEO routes remain acquisition pages; they should not compete with the core
  action in global navigation.
- `/resources` remains an optional, clearly labelled utility page until a
  provider-specific offer has been approved and verified.
- `/rankings/predictions` must either separate `commentator` and `friend` rows
  or make the selected population explicit before it is promoted in this map.

## Ordered work and evidence gates

1. **Release health (`npb-predictions-arr`)** — reproduce the intermittent
   503/1102 for `/rankings/predictions` and the scoreboard route. Capture route,
   status, payload size, latency, Worker/Cloudflare evidence, then remove the
   broad fetch/render path that causes it. Pass only after repeated public 2xx
   responses within the health script budget.
2. **Information architecture (`npb-predictions-gop`)** — make the persona and
   population visible in the ranking journey; test desktop and mobile routes.
   Do not add a second navigation system.
3. **Measurement** — define first-party events for `expert_view`,
   `prediction_started`, `prediction_saved`, `group_created`, `invite_shared`,
   `invite_joined`, and `score_returned`. Each has an owner, schema, privacy
   statement, and query before it is used as a KPI.
4. **Seven-day readout** — report route health, funnel counts and conversion,
   group completions, and return visits. A zero/insufficient sample is a failed
   acquisition experiment, not evidence that the product is valuable.
5. **One monetization decision** — choose one provider and one offer only after
   the readout. The implementation must contain a real provider URL, sponsored
   disclosure, click event, and provider-side conversion/revenue evidence.

## Explicit non-goals for this cycle

- Do not enroll in an affiliate network, accept terms, create an ad account,
  pay for traffic, or publish a paid link without the human checkpoint.
- Do not count generic Amazon/Rakuten searches or `/api/affiliate/click` rows
  as revenue.
- Do not change `GOAL.md` or `MONETIZATION.md` until this plan receives the
  project APR review; `apr list` currently reports no configured workflow.

## Success / prune rules

- Success: reliability gate passes; the journey is measurable; a single offer
  is decision-ready; later, provider-side evidence confirms yen revenue.
- Prune: a route or monetization surface that neither advances the canonical
  journey nor produces its named evidence is demoted or removed rather than
  kept as navigation clutter.
