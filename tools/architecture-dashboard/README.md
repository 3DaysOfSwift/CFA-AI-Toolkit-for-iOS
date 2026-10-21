# Xcode Project Dashboard tool

Part of the CFA AI Toolkit for iOS, created and published by
[3DaysOfSwiftConcurrency.com](https://www.3daysofswiftconcurrency.com/) as a free,
open-source gift to the iOS development community. The publisher offers Swift
Concurrency training for iOS developers. Copyright © 2026 3 Days of Swift Concurrency.
Distributed under the toolkit’s MIT licence.

Cooperative Feature Architecture (CFA) is the architecture supported by the
toolkit, not the product name.

A local-first starting point for **Modern Architecture Analysis** of Swift and
Xcode repositories. Locate concurrent work, inspect its source and identify
questions to investigate before migration. The purpose is understandable code
and evidence-backed ratings of behavioural separation and test protection.

## Try it

For an AI-guided review, use the reusable prompt in [instructions.md](Documentation/instructions.md).

Requires Node.js 20 or newer. No package installation or network access is needed.

For a quick read-only CFA ownership map, use the bundled command:

```sh
node src/cfa.mjs inspect /path/to/your-ios-repository
node src/cfa.mjs inspect /path/to/your-ios-repository --json
```

It identifies screen/ViewModel pairs, visible `AppModel.shared` feature routes,
feature collaborators, and named ViewModel tests. The JSON inspection schema is
version 2 and names route fields `featureType` and `featureFile`. Findings are
lexical leads to check in source; zero findings is not a conformance verdict. This command does
not write a report or alter the inspected project.

```sh
node src/cli.mjs /path/to/your-ios-repository --out reports/first-review
open reports/first-review/report.html
```

The output directory must be new. Add `--include-tests` to include test-named
directories. `report.html` is a self-contained interactive page; `report.json`
is the versioned evidence data. The scanner never changes the app being analysed.
Reports include source excerpts: review them before sharing or publishing.

## Project dashboard

The first tab is a project dashboard of the scanned project. Click
source counts to inspect their evidence: explicit task creation, unstructured
tasks, child-task declarations, framework entry points, await keywords and explicit
MainActor annotations in UI and feature files.

The dashboard includes reviewed UI / Model separation and test-quality ratings.
Ratings require source-backed classifications, not keyword-count guesses.
Import source-linked journey notes using `--observations observations.json`.
Each journey shows task identity, context, steps, expandable source evidence and
explicit unknowns. Sites without notes remain listed.

See [OBSERVATIONS.md](Documentation/OBSERVATIONS.md) for the format. A source fingerprint rejects
notes attached to different scanned Swift contents. Validation checks source
alignment, not the truth of a claim. Reports are offline snapshots, not live views.

```sh
node src/cli.mjs /path/to/app --out reports/inventory
# Inspect source and write observations.json using report.json IDs and fingerprint.
node src/cli.mjs /path/to/app --observations observations.json --out reports/observed
```

## Current capabilities

- Maps `@main` declarations and source locations of task/scheduling instructions.
- Separates unstructured tasks, detached tasks, async-let bindings, group scopes,
  possible child creation sites and framework callbacks.
- Provides filters, file drill-down, source excerpts and review questions.
- Finds limited GCD, blocking-work and UI-responsibility warnings.
- Records scan scope and a Swift-source fingerprint for observation alignment.
- Runs offline, without analytics, external fonts, scripts or CDN assets.

This is a **lexical inventory prototype**, not a Swift compiler, runtime profiler
or completed architecture audit. Counts describe matched source sites, not active
tasks. Declaration roles are naming heuristics. It does not resolve Xcode target
membership, conditional compilation, wrappers, inferred isolation or call graphs.
Swift string interpolation and regex literal parsing are incomplete. It can
miss real sites or match custom APIs with familiar names. Unknowns stay unknown.

There is no automatic race proof. The review supplies business-rule classifications
and matching test scenarios; the tool calculates ratings from those inputs.
Unstructured Tasks carry prominent lifetime/cancellation warnings, not automatic
defect verdicts. Synchronous work can run inside a Task.

## Reviewed dashboards for any supported project

The CLI requires Swift Concurrency syntax in the selected source scope. Verify
the actual iOS target and live wiring during review; lexical detection alone is
not compiler confirmation. SwiftUI MVVM, features and a central composition
root are supported without requiring an AppModel symbol or Trend's folder names.

Read [Review inputs](Documentation/REVIEWS.md) for findings, test scenarios and
Xcode test-summary import:

```sh
node src/cli.mjs /path/to/app --project-name 'Example iOS App' \
  --observations /path/to/observations.json --review /path/to/review.json \
  --test-results /path/to/test-summary.json --out reports/review
```

Historical Trend examples and reports are excluded from the public toolkit.
Never reuse another app’s source classifications.

## Next milestones

1. **Semantic evidence:** compiler/index-aware discovery of calls, target settings,
   live implementations, actor isolation and task-handle ownership.
2. **Reviewed journeys:** task lanes showing creation, awaited calls, suspension,
   error paths and cleanup, with each relationship linked to source evidence.
3. **Diagnosis:** demonstrate possible stale-write/cancellation interleavings,
   separate confirmed problems from risks, and attach regression tests.
4. **Migration reviews:** optional AppModel-template checks, confirmed findings,
   baseline comparisons and transparent progress toward agreed changes.
5. **Runtime corroboration:** attach relevant Instruments/test evidence without
   confusing an illustrative schedule with an observed execution.

Keep factual Swift Concurrency analysis separate from a team's chosen MVC/MVVM
or feature conventions. Review evidence before proposing refactoring.

## Development

```sh
node --test
```

The analyser and renderer are separate modules. Report data has a schema version
so future semantic analysis can improve without coupling it to the webpage.

## Project status and inspiration

Packaged as part of the CFA AI Toolkit for iOS under the root MIT licence.
The report remains a lexical inventory prototype suitable for supervised reviews.
The toolkit release bundles this executable with the dashboard skill. Node.js 20+
is still required; the scanner needs no package download or network access.
AI-authored ratings require reviewed source evidence and do not certify an app.

The visual-report direction was informed by exploring
[Visual Explainer](https://github.com/nicobailon/visual-explainer).
This implementation does not copy or vendor its source and is not a fork.
