# Run `npb-product-recovery` In This Session

Use this prompt when the user wants to run the Looper-designed loop in the current LLM session.
This is the default/easy execution path. The Python runner is the advanced path for running later or outside the session.

## Operator Instructions

You are executing a Looper-designed loop in this current session.
Follow the resolved spec below, write handoff files into the workspace, and enforce the caps manually.
Do not use `run-loop.py` unless the user explicitly asks for the advanced external runner.

1. Create the workspace directory if it does not exist.
2. Read the context sources before drafting the plan.
3. Draft `plan.md` in the workspace.
4. Run the plan gate. Apply programmatic checks when available. For judge criteria, use the configured judge only after consent for any non-local egress; otherwise ask the user to approve a human/current-session substitute.
5. Revise until the gate passes or `max_revisions` is reached.
6. Produce `delivery-N.md` in the workspace.
7. Run the delivery gate after each delivery.
8. Stop when all delivery criteria pass, a cap is reached, or the user stops the loop.
9. Keep `state.json` current with status, iteration, last gate, consent, and blockers.
10. Append a compact entry to `run-log.md` after every context read, model call, check, gate verdict, revision, blocker, and stop decision.
11. Compare each blocker against the previous blocker. If the same blocker repeats for the configured no-progress window, stop or ask for the configured human checkpoint instead of revising again.
12. Treat token and USD budgets as operator limits in this session: if exact accounting is unavailable, stop and ask before continuing when the loop appears likely to exceed them.

## Files

- Source spec: `loop.yaml`
- Human summary: `LOOP.md`
- Resolved spec: `loop.resolved.json`
- Workspace: `./loop-workspace`
- State file: `state.json`
- Run log: `run-log.md`

## Goal

Within one seven-day cycle, turn the NPB Predictions core job into a clear journey: compare an expert prediction, make or view a personal prediction, invite a friend into a group, and return to check the score. Repair any release blocker on that journey, measure the journey, and produce a decision-ready monetization experiment. Do not claim revenue until a provider dashboard or payment record confirms yen earned.

## Definition Of Done

One primary persona and canonical route map are recorded; the first-run and group-invite journeys have deterministic checks; public release health is measured; activation and referral events have named owners and queries; and exactly one monetization experiment is ready for a human business decision. The run ends with either verified revenue, a documented failed hypothesis, or a human-approved external-provider action -- never with an unmeasured affiliate link.

## Context Sources

- Read file `../../GOAL.md`
- Read file `../../SPEC.md`
- Read file `../../MONETIZATION.md`
- Read file `../../MARKETING_STRATEGY.md`
- Read file `./inputs/current-state.md`

## Verification Criteria

- `loop-artifacts-valid` programmatic: run `["python3", "loops/npb-product-recovery/scripts/verify_loop.py"]` and expect `exit_zero`
- `journey-regression-suite` programmatic: run `["npm", "--prefix", "web", "test", "--", "date-navigation"]` and expect `exit_zero`
- `release-health` programmatic: run `["python3", "loops/npb-product-recovery/scripts/check-public-health.py", "https://npb-predictions.pages.dev"]` and expect `exit_zero`
- `business-decision` human signoff: Choose whether to open one named affiliate/advertising provider account or keep monetization disabled. This loop must not enroll, accept terms, or publish paid links without that decision.


## Council

- No council members configured.

## Gates

### plan_gate

- When: `after_plan`
- Policy: `fixed_passes`
- Verdict source: `none`
- Criteria: `loop-artifacts-valid`
- Max revisions: `2`

### delivery_gate

- When: `after_each_delivery`
- Policy: `fixed_passes`
- Verdict source: `none`
- Criteria: `loop-artifacts-valid, journey-regression-suite, release-health, business-decision`
- Max revisions: `2`

## Loop Control

- Max iterations: `7`
- Budget: `{"tokens": 400000, "usd": 0.0, "wall_clock_min": 120}`
- No-progress: `{"action": "stop", "max_stalled_iterations": 2, "signals": ["the same user journey has no measurable event or deterministic test", "the same public release failure repeats without a root-cause fix", "an affiliate plan names no provider, offer, disclosure, or revenue evidence"]}`
- Human checkpoints: `before an affiliate, advertising, payment, or account-creation action, after the first seven-day experiment readout`
- Stop conditions:
  - one journey and one monetization experiment pass their evidence gates
  - a provider/payment dashboard verifies revenue in yen
  - the hypothesis fails and a prune decision is recorded
  - a human business decision is required
  - max_iterations reached
  - same blocker repeats for 2 iterations
  - any budget cap exceeded

## Execution Boundary

- Mode: `in_session`
- Isolation: `current_workspace`
- Side effects: `{"duplicate_action_check": true, "requires_approval": true}`

If the loop needs scheduled runs, child-agent lifecycle management, concurrency control, or restart-safe step retries, stop and tell the user this Looper spec should be handed to a durable orchestrator.

## Observability

- State file: `state.json`
- Run log: `run-log.md`
- Checkpoint granularity: `gate`

Use `state.json` for the latest resumable status and `run-log.md` for the append-only history of what happened.

## Privacy

- No cross-vendor egress configured.

## Start Now

If the user asked to run now, begin at step 1 under Operator Instructions and keep going until a stop condition is reached.
