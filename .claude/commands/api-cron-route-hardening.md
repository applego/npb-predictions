---
name: api-cron-route-hardening
description: Workflow command scaffold for api-cron-route-hardening in npb-predictions.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /api-cron-route-hardening

Use this workflow when working on **api-cron-route-hardening** in `npb-predictions`.

## Goal

Improve robustness and error handling of cron-related API routes, often in response to runtime or deployment issues.

## Common Files

- `web/src/app/api/cron/recalculate/route.ts`
- `web/src/app/api/cron/update-games/route.ts`
- `web/src/app/api/cron/update-standings/route.ts`
- `web/src/app/api/cron/update-titles/route.ts`
- `web/src/lib/cron-auth.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Identify issue in one or more cron API routes (e.g., env access, error handling, DB limits).
- Edit one or more files under web/src/app/api/cron/*/route.ts to address the problem.
- Optionally, add or update a shared helper in web/src/lib/ (e.g., cron-auth.ts).
- Commit changes, often with detailed commit messages referencing the specific cron route(s) affected.

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.