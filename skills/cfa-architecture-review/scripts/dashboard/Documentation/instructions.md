# Analyse a Repository with Xcode Project Dashboard

Copy the prompt below into your AI coding assistant. Replace the paths and make
the CFA Architecture Review skill available to the assistant. This file is a
starting prompt, not an automatically installed skill.

## Starting Prompt

Use the `cfa-architecture-review` skill to produce an Xcode Project Dashboard for this iOS Swift Concurrency repository:
`/path/to/application`.

The Xcode Project Dashboard tool is at `/path/to/architecture-dashboard`.
Read its root README, Documentation/OBSERVATIONS.md, Documentation/REVIEWS.md,
and the repository's own instructions. Verify that the selected iOS target uses
Swift Concurrency; this dashboard is not for GCD-only projects.

Do not modify the application, commit changes, or publish its source or reports.
Generate a local architecture dashboard describing the current codebase, rather
than starting a refactoring exercise. Write outputs to a new report directory
outside application source.

First generate the source inventory using the dashboard tool. Then use the skill to
inspect the actual implementations and trace important features from their entry
points through completion. Identify task creation, structured child tasks,
potential suspension points, actor isolation, handle ownership, cancellation,
and operation ordering. Distinguish UI coordination from feature work on
MainActor. Investigate layer bypasses against the project's declared architecture,
not an assumed universal architecture.

Separate verified source facts, suspected risks, unknowns and runtime observations.
Link findings to source paths and line numbers. Counts must describe their scope:
creation sites are not runtime task totals; ordinary awaits are not child tasks;
concurrent children are not proof of parallel execution. Do not penalise
unstructured tasks merely for being unstructured.

Record source observations using the format in Documentation/OBSERVATIONS.md within the dashboard tool repository. Copy the scan's
sourceFingerprint and exact creation-site IDs. Document each journey's scope,
steps, task identity, actor context, evidence ranges and unresolved boundaries.
Generate UI / Model separation and test-quality ratings. Follow the skill's
formulas, fractional stars and colour thresholds. Read business rules and test
assertions across the entire selected application, not a sample. Follow the
skill's full-analysis completion gate and retain analysis-ledger.md with every
source/test file and feature accounted for. Continue until reconciliation is
complete; speed is secondary to thoroughness. If genuinely blocked, report
“Analysis incomplete — project ratings withheld”, identify the unfinished work
and withhold partial ratings. Do not use ratingScope: reviewed-rules. Do not
substitute keyword counts for semantic review. Journey-note coverage is not test
execution coverage. Do not automatically refactor or delete tests.

Import findings and test scenarios with --review, and real Xcode summaries with
--test-results when available. Omit unsupported metric cards rather than showing
unfinished placeholders. Use the generic CLI, never the Trend example generator.

Return the dashboard link, analysis scope, verification performed and outstanding
unknowns. Import the observations with --observations and generate a new report.

## Current Capability

The dashboard tool currently generates a lexical source inventory and an interactive
HTML dashboard. It imports source-linked journey observations, reviewed findings,
test scenarios, Xcode summaries and optional line coverage. Ratings are calculated
from reviewed classifications. Investigation is performed by the AI or developer;
the scanner does not infer journeys or prove observations.

From the dashboard tool directory, the inventory command is:

```sh
node src/cli.mjs /path/to/application --out reports/first-review
```

Choose a new output directory for each report. Reports contain source excerpts;
review them before sharing.
