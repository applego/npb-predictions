# Run log

- 2026-07-23: created the project-owned recovery loop from public route, role,
  and affiliate evidence; no generic `applego/loopandloop` template was edited.
- 2026-07-23: plan gate passed: loop source verifier and UTC date-navigation
  regression test passed.
- 2026-07-23: delivery gate blocked: the public health check observed HTTP 503
  on `/rankings/predictions`; revenue/provider action is intentionally not run.
- 2026-07-23: APR check blocked: `apr list` reported no configured workflow.
- 2026-07-26: reframe delta — replaced the request "place affiliate links and
  ads" with a release-gated, single-offer revenue experiment. Current official
  provider research supports A8.net as the first *human-approved* media
  registration candidate; individual offers, rates, and eligibility remain
  dashboard-verified unknowns. AdSense and generic commerce links are deferred
  until reliability and first-run measurement gates pass.
- 2026-07-26: Oracle Deep Research submission was not created because its
  mandatory browser-auth smoke returned `APR_OK` but did not settle to the
  wrapper's required captured `apr-health: OK` line. No duplicate research run
  was submitted; official primary-source research was used as the fallback.
