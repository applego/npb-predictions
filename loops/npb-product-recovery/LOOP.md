# npb-product-recovery

Recover trust in the core prediction experience, then prove or reject one monetization hypothesis with observable user behavior before adding ads or affiliate surfaces.

## Goal

Within one seven-day cycle, turn the NPB Predictions core job into a clear journey: compare an expert prediction, make or view a personal prediction, invite a friend into a group, and return to check the score. Repair any release blocker on that journey, measure the journey, and produce a decision-ready monetization experiment. Do not claim revenue until a provider dashboard or payment record confirms yen earned.

## Definition of Done

One primary persona and canonical route map are recorded; the first-run and group-invite journeys have deterministic checks; public release health is measured; activation and referral events have named owners and queries; and exactly one monetization experiment is ready for a human business decision. The run ends with either verified revenue, a documented failed hypothesis, or a human-approved external-provider action -- never with an unmeasured affiliate link.

## Verification

- `loop-artifacts-valid` (programmatic)
- `journey-regression-suite` (programmatic)
- `release-health` (programmatic)
- `business-decision` (human)

## Council

- No council members configured.

## Gates

- Plan gate: fixed_passes
- Delivery gate: fixed_passes

## Loop Control

- Max iterations: 7
- Budget: `{"tokens": 400000, "usd": 0.0, "wall_clock_min": 120}`
- No-progress: `{"action": "stop", "max_stalled_iterations": 2, "signals": ["the same user journey has no measurable event or deterministic test", "the same public release failure repeats without a root-cause fix", "an affiliate plan names no provider, offer, disclosure, or revenue evidence"]}`

## Execution Boundary

- Mode: `in_session`
- Isolation: `current_workspace`
- Side effects: `{"duplicate_action_check": true, "requires_approval": true}`

## Observability

- State file: `state.json`
- Run log: `run-log.md`
- Checkpoint granularity: `gate`

## Flow Preview

```text
+--------------------------------+
| 1. Goal + context              |
| read sources                   |
+--------------------------------+
               |
               v
+--------------------------------+
| 2. Draft plan.md               |
| state -> state.json            |
+--------------------------------+
               |
               v
+--------------------------------+
| 3. Plan gate                   |
| verdict: human                 |
+--------------------------------+
               | needs work -> revise <= 2 -> step 2
               | pass
               v
+--------------------------------+
| 4. Write delivery-N.md         |
| log -> run-log.md              |
+--------------------------------+
               |
               v
+--------------------------------+
| 5. Delivery gate               |
| verdict: human                 |
+--------------------------------+
               | needs work -> revise <= 2 -> step 4
               | pass
               v
+--------------------------------+
| 6. Final output                |
| all gates clean                |
+--------------------------------+

Stops: pass gates | max 7 iterations | no progress x2 | budget 120m, $0.0, 400000 tokens
```
