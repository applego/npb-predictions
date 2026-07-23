# NPB product-recovery evidence — 2026-07-23

## User-value failures observed on the public site

- `/rankings/predictions` presents friend predictions and commentator
  predictions in one undifferentiated table. The heading and page copy imply
  all rows are commentators even though the data has distinct roles.
- `/games/2026-05-20` rendered a same-day next link and an incorrect previous
  date under the Cloudflare UTC runtime. The UTC-safe date-navigation fix is
  on `dev` in commit `24ddf28` and must reach production before the journey is
  considered reliable.
- `/resources` displays four ordinary outbound links and reports zero
  monetized links. Click logging is not revenue evidence.
- The public worker has intermittently returned Cloudflare 503/1102 responses;
  a static build passing is not evidence that the deployed journey is healthy.

## Reframed objective

The literal request was to improve the application and make a profit loop.
The real question is whether a fan has a repeatable reason to use the product,
bring a friend, and later accept a relevant commercial offer. Therefore this
cycle first repairs and measures the core loop; it treats advertisements,
affiliate enrollment, payment, and external account creation as a separate
human business decision.

## First-cycle funnel

1. Acquisition: a search/social visitor opens a commentator prediction or
   score page.
2. Activation: the visitor compares that prediction with their own prediction.
3. Referral: the visitor creates or joins a private prediction group.
4. Retention: the visitor returns after standings change to view score movement.
5. Monetization: only after the above works, test one named offer with a real
   provider URL, disclosure, click event, and provider-side conversion record.

## Evidence standard

- Product event: a named analytics event with a queryable count.
- Public health: a deployed route returns 2xx repeatedly within the defined
  latency budget; a local build alone is insufficient.
- Revenue: provider dashboard, invoice, or payment record in yen. Outbound
  click counts and generic search URLs are leading signals only.
