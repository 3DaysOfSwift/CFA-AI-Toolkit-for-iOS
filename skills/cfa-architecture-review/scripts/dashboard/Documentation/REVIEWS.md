# Review and test-result inputs

The generic CLI accepts `--review review.json`, `--test-results summary.json`
and `--project-name 'Your iOS App'`. No example generator or Trend installation
is required. Use `--observations` for separation rules and Task journeys as
described in [OBSERVATIONS.md](OBSERVATIONS.md).

## Review JSON (version 1)

```json
{
  "schemaVersion": 1,
  "sourceFingerprint": "from the current inventory report.json",
  "author": "Reviewer",
  "scope": "Feature commands and their tests; no runtime tracing",
  "findings": [{
    "title": "Can overlapping saves lose an edit?",
    "status": "Ordering risk — source review",
    "description": "Explain the actual implementation and consequences.",
    "check": "Describe a focused regression scenario; not an executed test.",
    "evidence": [{"file": "App/SaveFeature.swift", "line": 10, "endLine": 20}]
  }],
  "testQuality": {
    "scope": "Named scenario groups reviewed, with exclusions",
    "scenarios": [{
      "title": "Successful save is persisted",
      "status": "identified",
      "detail": "Explain which assertions verify this behaviour.",
      "evidence": [{"file": "AppTests/SaveTests.swift", "line": 5, "endLine": 18}]
    }],
    "concerns": [{
      "title": "Does the export test inspect its payload?",
      "detail": "Explain what it currently checks and what could still break.",
      "evidence": [{"file": "AppTests/ExportTests.swift", "line": 5, "endLine": 18}]
    }]
  },
  "evidenceHashes": {
    "AppTests/SaveTests.swift": "SHA-256 of the exact UTF-8 file bytes",
    "AppTests/ExportTests.swift": "SHA-256 of the exact UTF-8 file bytes"
  }
}
```

`findings` and `testQuality` are optional. `scenarios` must have unique titles
and status `identified` or `not-identified`. Read assertions before assigning
identified, and cite them. Not-identified requires a test search and a documented
scope; cite the feature behaviour needing protection. `concerns` defaults to an
empty list. Optional `keep` is one `{title, detail, evidence}` item explaining a
useful test that should not be dismissed as trivial.

Evidence paths are repository-relative with inclusive line ranges. Production
files use scan hashes; excluded test files require `evidenceHashes`. The importer
reads actual excerpts, rejects changed files and out-of-repository paths, and
does not trust supplied excerpt text. Validation cannot prove reviewer judgments.

## Concurrency operation review

Optional `concurrencyChecks` supplies end-to-end source reviews. Each item needs
`siteId` (Task, detached Task, SwiftUI task or refresh instruction), `title`,
`status` (warning/managed/unresolved), `path`, `trigger`, `navigation`,
`repetition`, `lifetime`, `effect`, `conclusion`, `verification` and `evidence`.
Text fields are plain English; evidence must include the trigger and should also
cover the intervening layers and terminal effects. Only one record per trigger;
describe its branches together. Hash/range validation applies to all references.

The report groups these under Concurrency Warnings and separately counts managed
operations and unresolved checks. Missing records do not mean safe. These counts
are reviewed operations, not a whole-project rating. The importer validates
shape and source provenance, not completeness or the truth of authored conclusions.
The AI must trace dispatch, mutation, cancellation and repeated requests through
actual code; the lexical scanner does not generate a semantic call graph.

Check `.task` navigation cancellation, `.task(id:)` cancellation/restart on ID
changes, and repeated Button invocations (no automatic cancellation). Inspect
feature guards before suspension, independent workers, state ordering, partial
writes and remote commit/idempotency boundaries. A load can also mutate storage.
Cancellation does not roll back server work. Correctly managed roots and shared
workers are valid outcomes, not automatic warnings.

## Task lifetime review

Optional `taskLifetimes` lists one source-backed record per unstructured root:
`siteId`, `handle` (tracked/untracked/unknown), `creator`
(task/synchronous/unknown), `wait` (awaited/not-awaited/not-applicable/unknown),
`cancellation` (forwarded/not-forwarded/not-applicable/unknown), `policy` text,
and `evidence` ranges. Evidence uses the same hash validation as findings.
Root means an independent Task tree, not necessarily a button entry point.
An unstructured Task created inside another Task remains an independent root.
SwiftUI-managed roots are listed separately from explicit Task constructors.

Trace every call path before classifying creating context; mixed or unresolved
callers stay unknown. Synchronous creators use not-applicable for both relationships.
Awaiting a handle does not forward cancellation; retaining a handle does neither
automatically. Count these relationships separately and explain intentional shared
loads and committed saves. Untracked does not mean faulty. Missing review records
appear as unresolved, never as zero-risk or confirmed defects.

## Rating completion

Full skill-driven reviews provide separation observations and test scenarios
only after the skill's full-analysis completion gate passes. Inspect every
in-scope production and test file and reconcile features, rules and scenarios in
analysis-ledger.md. A selected subset is not a project-wide rating. Omit unfinished
rating inputs from interim reports and clearly state that analysis is incomplete.
UI / Model separation is round(100 × testable model rule groups / reviewed rule
groups). Test quality is round(100 × scenarios with matching assertions / reviewed
scenarios). Both must state their reviewed scope. Stars = displayed test-quality
score / 20 with fractional fill; 80–100 green, below 80 red. A 100 only describes
the reviewed set. Test quality is a scoped behavioural-protection measure, not
mutation resistance or exhaustive coverage. Do not double-count identical rules
or inflate denominators with irrelevant scenarios. Empty inventories do not
produce a numeric score. Complete the review, or explain a real blocker separately.

## Xcode test results

Export a completed run without modifying the app:

```sh
xcrun xcresulttool get test-results summary --path /path/to/Tests.xcresult > summary.json
```

Supply that file with `--test-results`. Required fields are nonnegative integer
`passedTests`, `failedTests`, `skippedTests`, `totalTestCount`, plus numeric Unix
`startTime`. Counts must sum to total. The gauge uses passed / total including
skips; zero total has no percentage. Source alignment is explicitly unverified.
Pass rate is not code coverage. Import xccov separately when available; absent
coverage is omitted, never substituted with a pass percentage.

## Supported scope

This dashboard is for modern iOS applications using Swift Concurrency, including
SwiftUI MVVM with features and a central composition root. Names and
folder labels are not mandatory. The CLI rejects a scope with no Swift Concurrency
syntax; the reviewer must still resolve target membership and custom-name false
matches. It is a lexical scanner plus authored review, not a Swift compiler.

## Operation assessments

The report opens with operation assessments. These describe the current source,
including synchronous button actions, app launch, navigation, notifications and
subscriptions. They are reviewer judgments, validated against source hashes;
keyword counts do not generate a passing assessment.

Add `operationInventory` and `operations` to a review input:

```json
{
  "operationInventory": {
    "scope": "Settings screen",
    "method": "Enumerated its button handlers and lifecycle callbacks",
    "coverage": "partial"
  },
  "operations": [{
    "id": "change-units",
    "title": "Change display units",
    "trigger": "Units picker changes",
    "triggerSource": {"file": "SettingsView.swift", "line": 20},
    "path": "Picker → SettingsViewModel.setUnits → SettingsFeature.setUnits",
    "stateOwner": "SettingsFeature owns the selected units",
    "taskOwner": "Synchronous action; no new Task",
    "isolation": "MainActor throughout the observed path",
    "correctness": "sound",
    "clarity": "sound",
    "reason": "One state owner applies the selection",
    "verification": "Source inspection; runtime behavior not exercised",
    "unknowns": [],
    "evidence": [{"file": "SettingsView.swift", "line": 20, "endLine": 24}]
  }]
}
```

Include evidence for each claimed path boundary and owner, not just the trigger.
Both judgment fields accept `sound`, `problem`, `investigate`, or `unassessed`.
A problem requires `problemKind`: `local-defect` or `architectural-conflict`.
Use `recommendation` only for proposed changes; never put an intended design in
`path`, `stateOwner`, `taskOwner`, or `isolation`. Record unresolved dispatch,
isolation and lifetime boundaries in `unknowns` and do not mark those operations
sound. The importer reloads excerpts from the source; it does not verify the
reviewer's reasoning or prove a complete call graph.

Inventory coverage is `partial` or `complete`. A complete inventory requires
an explicit discovery method and all identified entry points, including rows
that remain unassessed. Missing or incomplete assessments produce an inconclusive
overall result. A local defect alone does not establish an architectural conflict.
Regenerate the analysis and review after source changes. An exported HTML file is
a dated snapshot and does not monitor the project for changes.
