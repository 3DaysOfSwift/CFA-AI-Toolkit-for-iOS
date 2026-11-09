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
Feature collaborators, named ViewModel and Feature tests, and possible departures
from the CFA folder map. The JSON inspection schema is version 2. Its route
fields `featureType` and `featureFile` distinguish a written type name from a
located declaration. Scan one app directory at a time if the repository contains
multiple AppModel files.

Use the findings to verify source, target membership, and Xcode navigator
placement. An intentional package boundary can explain a different physical
location. A matching test filename identifies a candidate test file. The command
reads source and prints its findings without modifying the inspected project.

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
Ratings require source-backed classifications. In any architecture, trace who
owns each task, whether callers wait for it, and what should happen on
cancellation before judging the design. In CFA, a Feature-owned shared refresh
normally continues even after its last screen caller leaves. If a screen needs
to stop waiting promptly, verify that its wait can end independently while
the refresh continues. For a CFA project, record a
departure from a CFA convention separately from a Swift Concurrency defect.
For example, a ViewModel-created task with no retained handle merits a CFA
ownership finding. Establish a consequence, such as an obsolete task
publishing over a newer result, before calling it a correctness defect.
Import source-linked journey notes using `--observations observations.json`.
Each journey shows task identity, context, steps, expandable source evidence and
explicit unknowns. Sites without notes remain listed.

See [OBSERVATIONS.md](Documentation/OBSERVATIONS.md) for the format. A source fingerprint rejects
notes attached to a different scanned source or build configuration. Validation checks source
alignment, not the truth of a claim. Reports are offline snapshots, not live views.

```sh
node src/cli.mjs /path/to/app --out reports/inventory
# Inspect source and write observations.json using report.json IDs and fingerprint.
node src/cli.mjs /path/to/app --observations observations.json --out reports/observed
```

## Current capabilities

### Shared project analysis

`project-analysis.mjs` creates a source-fingerprinted analysis record for review
and migration. It combines the SwiftSyntax inventory, including written call
expressions and task sites, with optional compiler-indexed call relationships:

```sh
node src/project-analysis.mjs /path/to/project --out /path/to/new-analysis.json
node src/project-analysis.mjs /path/to/project --out /path/to/new-analysis.json --index-store /path/to/Index.noindex/DataStore --module ModuleName
```

The index must correspond to the intended target and configuration. Its freshness
is unverified; a missing or unreadable index is recorded as unavailable. Syntax
calls do not resolve overloads, and indexed calls are not a runtime task tree.
Written calls include possible indexed matches on the same source line; those are
navigation leads, not confirmed matches, and may be ambiguous.
Inspect callers, actor boundaries, ownership and behaviour before making a
judgment. Health Check preparation writes the same record as
`project-analysis.json`; add `--index-store <path> --module <name>` to its
`prepare` command to include an existing index. The migration skill bundles the
same analyser for its baseline. Analysis output may contain source paths and
symbols, so review it before sharing.

For paid capabilities, use the [entitlement review workflow](Documentation/entitlement-review.md)
to find candidate call sites and trace their entry points. Verify presentation
access and the locked and entitled outcomes separately.

### Readable Health Check report

For a whole-app Health Check, first run
`node src/whole-app-health.mjs prepare <project-root> <new-inventory-directory>`.
On macOS with Xcode, this also compiles a local SwiftSyntax inventory and writes
`task-map.json` with source-located tasks and lexical nesting. It does not infer
task ownership or runtime parentage. Parser failure and scope mismatches remain
visible for investigation.
Reconcile the current inventory against the production targets, source files,
operation entry points and task sites, then use `node src/whole-app-health.mjs report
<project-root> <review.json> <new-report.html> [app-icon.png]`. The report is
generated after the current source and review evidence pass the coverage
checks. If coverage is unresolved, the command lists the remaining checks in
the terminal. To resume a batch, run
`node src/whole-app-health.mjs next <project-root> <review.json>`.
Use `nextFiles`, `nextEntryPoints` and `nextTaskSites` to pick up the inventory.
`nextFileReviews` and `nextTypes` include the recorded reasons and source
locations for work already started. `nextOperations` identifies missing traces,
open checks, timing scenarios and invalid task links. Use the operation ID
to find the corresponding entry in the draft and update its evidence.
When target membership still needs verification, `targetReview` lists relevant
project files and exclusions to check. The `gaps` list also flags missing
report criteria and invalid report text. Resolve those gaps before rendering.
The scanner cannot establish target membership or discover every event by itself.

`next`, `progress` and `report` recheck the current project against the
fingerprint from `prepare`. Changes to scanned Swift files or local build
definitions can invalidate the draft. If the fingerprint differs, run
`prepare` into a new directory with the intended scope. Recheck changed
source, target membership and task locations, then carry forward only
judgments whose evidence still supports them. Keep the fresh draft's
fingerprint and scan scope.

The review's `presentation` requires `app`, `summary`, `verdict`, `conclusion`
and a nonempty list of `criteria`. Use the verdict to describe the app’s
concurrency design. Each criterion has a `title`, `detail`, `status` (`pass`,
`concern` or `problem`) and source `evidence` ranges (an array of `{file, line, endLine}` objects). The
importer checks ranges against the scanned source. Map app-level assessments to criteria with
`appChecks` as described in [Whole-app report criteria](Documentation/REVIEWS.md#whole-app-report-criteria). Convert free-text citations
in older reviews to file and line ranges before rendering. Include confirmed
operation, file and type problems among the report criteria. The renderer weights criteria
equally (1, ½ or 0 respectively) to choose the assessment label. The score
reaches 100% only when every reviewed criterion passes. A confirmed problem
keeps the Result marked as needing attention even if the score is high. Set `qualitativeOnly`
to show the Result without a percentage. Coverage comes from the whole-app
review workflow. Runtime claims need their own evidence, regardless of the score.

### Experimental compiler-index map

On macOS with Xcode selected, map call sites from an existing Swift compiler
index for a specific module. Use an isolated index from a recent build of the
intended target and configuration; the map cannot verify that the supplied index
is current or complete. The command reads the index and does not build or alter
the application. It compiles a small temporary helper using Xcode's libIndexStore.

```sh
node src/program-map.mjs /path/to/project /path/to/Index.noindex/DataStore ModuleName /path/to/new-map
```

The output includes a launch-callback tree, searchable indexed call sites and
symbol identifiers. The generated entry point, framework callbacks, dynamic
dispatch and closure/task boundaries can be absent or misleading; the index
does not show runtime execution or establish task ownership. Calls without a
resolved in-module caller remain in the searchable inventory, not the tree.
Source hashes describe files at report time and do not verify index freshness.
Report files contain source paths and symbols; review them before sharing.

- Maps `@main` declarations and source locations of task/scheduling instructions.
- Locates some app-launch callbacks and button actions as possible event entry
  points; this is not a complete inventory of lifecycle or user actions.
- Flags recognizable CFA launch calls deferred through a `Task`, a dispatch
  queue, `OperationQueue.main.addOperation`, or a View lifecycle task. Follow
  the delegate and any helper calls in source to verify ordering and ownership.
- Separates unstructured tasks, detached tasks, async-let bindings, group scopes,
  possible child creation sites and framework callbacks.
- Provides filters, file drill-down, source excerpts and review questions.
- Finds limited GCD, blocking-work and UI-responsibility warnings.
- Flags explicit ViewModel and AppModel initializer inputs in recognizable
  SwiftUI Views. Type names ending in Feature or Repository are leads for
  source review. Confirm the declaration and its role, and trace screen callers
  to distinguish selected immutable detail data from injected dependencies.
  Reusable components can receive action closures that forward UI intent to
  their screen. Review synthesized initializers and type aliases in source.
- Flags explicit Task creation in recognizable View initializers and mapped
  screen ViewModel initializers. Trace helper calls and deferred closures to
  establish whether construction actually starts work.
- Records scan scope and fingerprints scanned Swift files and local build definitions.
- Runs offline, without analytics, external fonts, scripts or CDN assets.
- Lists scanned files and detected types as unassessed until a source-backed
  reviewer supplies a result; records explicit developer acceptance of a problem
  without changing the finding to a pass.
- Displays reviewer-authored event and task trees with evidence for each step.
  The scanner does not automatically infer those trees.

This is a **lexical inventory prototype**, not a Swift compiler, runtime profiler
or completed architecture audit. Counts describe matched source sites, not active
tasks. Declaration roles are naming heuristics. The lexical dashboard does not
resolve Xcode target membership, conditional compilation, wrappers, inferred
isolation or call graphs. The separate shared project analysis can add optional
indexed call relationships, subject to the freshness and ambiguity limits above.
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

From `tools/architecture-dashboard` in the toolkit source checkout, run
`npm test`. The installed skill includes the dashboard but not its development
test suite. Running `node --test` there can mistake renderer modules named
`test-*.mjs` for tests; it does not validate the dashboard.

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
