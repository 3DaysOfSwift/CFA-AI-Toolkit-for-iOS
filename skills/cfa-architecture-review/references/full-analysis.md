# Full-Analysis Completion Gate

## Required outcome

A project dashboard is a full source analysis of the selected application, not
a sample of interesting functions. Only the user can request a narrower scope.
Do not silently select 15 examples, score them, and call that the project's score.
Prioritise thoroughness over speed. Keep an evidence ledger so long reviews can
continue across interruptions without skipping or repeating completed work.

## Account for the whole project

Save `analysis-ledger.md` beside the generated report. Record:

- Target, configuration, Swift language/isolation settings, included extensions,
  local packages and source snapshot. Inspect Xcode membership and conditional
  compilation; scanning the repository is not the same as scanning one target.
- Every in-scope production and test source file, its fingerprint, inspection
  status and responsibilities. Read complete files, including portions omitted
  by truncated outputs. Mark genuinely generated/vendor code separately with
  the reason and the integration contracts inspected; never exclude difficult
  application code to make the review complete.
  The default dashboard scan excludes conventionally named test directories.
  Account for tests from target membership and read them separately, or use
  `--include-tests` to inventory them and keep test sites separate from
  production counts in the review. When citing tests omitted from the report
  scan, record their exact file hashes in `evidenceHashes` as described in
  [the review input format](../scripts/dashboard/Documentation/REVIEWS.md).
- Every feature entry point and its reachable implementation: Views, ViewModels,
  managers, repositories, services, actors, extensions, app intents, lifecycle
  callbacks, notifications and relevant synchronous work outside explicit Tasks.
- Every product-rule group with source lines, layer, testability and rationale.
  Record why inspected presentation-only code contains no product rule. Include
  validation, defaults, normalization, persistence, error/retry and ordering
  policies. Avoid counting one rule repeatedly or grouping unrelated rules into
  one large item to inflate the score.
- Every Task constructor/framework entry and its caller, ownership, cancellation,
  completion, error paths, actor boundaries and repeated-request policy. Follow
  wrappers and live protocol wiring. Reconcile scanner matches with source,
  rejecting false matches and recording missed constructs rather than trusting
  keyword totals. Trace all lifecycle paths; diagrams may group shared paths
  for readability without dropping their individual evidence.
- Every feature command's meaningful scenarios and their matching assertions,
  including fixtures and test doubles. Inspect all in-scope tests, not just names
  or a search result. Account for success, invalid input, failures, cancellation,
  overlaps and retries where applicable. Explain omissions as not applicable,
  not simply unreviewed. Separate established requirements from proposed tests
  whose expected behaviour needs a product decision.

## Reconcile before scoring

Perform a second pass against the ledger and original file inventory. Resolve
unread files, unclassified decisions, unexplained exclusions and untraced owned
code. Check UI-to-model paths in both directions so unreachable implementations
or bypassed layers cannot make the architecture look better than the live app.
Recheck hashes and settings; changed inputs invalidate affected review entries.
Check every finding against its cited lines and every test match against actual
assertions. Calculate ratings only after the inventory and review reconcile.

Completion means all in-scope files and feature areas are inspected and accounted
for, not that the application has no defects or that all tests pass. A missing
test is a finding, not unfinished analysis, once the relevant tests have been
searched and read. The required scenario inventory cannot be a convenient subset.
Unresolved application dispatch or semantics that could change a score block
that score until investigated. An opaque external SDK boundary may be documented
as external; do not pretend its internals were inspected.

## Publication gate

Before calling the dashboard complete, verify:

- All source/test ledger entries are resolved, with no unexplained exclusions.
- Business rules, Task lifecycles and test scenarios cover all selected features.
- Both architecture and test-protection ratings use those reconciled inventories.
- Evidence and displayed counts agree; no sampled rating is presented as global.
- Report navigation, highlighted source and visual layout have been checked, or
  any blocked presentation verification is stated separately.

Set `separation.complete: true` only after this process. Do not use the legacy
`ratingScope: reviewed-rules` override for a project dashboard. Do not supply
`testQuality` to the final renderer until the scenario review is complete.
The current importer validates data structure, not this ledger's completeness;
successful report generation is not permission to skip this gate.

If required source analysis cannot be completed, retain working evidence and
state **“Analysis incomplete — project ratings withheld.”** Explain precisely
what remains, why, and what is needed to resume. If an interim artifact is useful,
mark it prominently as incomplete and do not render its unfinished ratings.
“Reviewed rules only” is not an adequate explanation or an acceptable completion
claim. A sampled review has failed to fulfil a full-dashboard request.

Never change an old report's completion flag or wording without doing its missing
analysis. Historical Metro/Trend examples are not proof of complete review.

## Accuracy and measurements

Aim for complete, reproducible source inspection and evidence-backed statements.
Do not promise mathematical certainty or absence of every race from static code.
Clearly distinguish facts, reasoned architectural classifications, potential
defects and measured runtime behaviour. Full source inspection, test pass rate,
executed line coverage and runtime-path coverage are different measurements.
Never use “100% coverage” without naming which one and showing its evidence.

Import test runs only when their identity and provenance are known. If results,
coverage data or profiling access are unavailable, complete all source work and
state exactly which empirical checks were not performed. Missing runtime access
is not an excuse for a sampled source review, and a source review must not claim
that unexecuted tests passed. Request needed authority rather than bypassing it.
