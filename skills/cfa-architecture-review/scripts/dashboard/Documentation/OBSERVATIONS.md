# Source observations

Generate a baseline report, inspect the source, then supply an observations JSON
file with `--observations /path/to/observations.json` when generating a new report.
An inventory-only run can omit judgments. A full skill-driven dashboard includes
reviewed separation and test-quality ratings; see [Review inputs](REVIEWS.md).

## Format (version 1)

```json
{
  "schemaVersion": 1,
  "sourceFingerprint": "copy from baseline report.json",
  "author": "Name of person or AI producing the notes",
  "createdAt": "2026-09-13T00:00:00Z",
  "scope": "One local load path; no runtime tracing",
  "journeys": [{
    "id": "load",
    "siteId": "copy exact creation or framework entry id from report.json",
    "title": "Load saved data",
    "scope": "From the retained task to completion; storage internals not traced",
    "steps": [{
      "action": "Create and retain the load task",
      "task": "Load task",
      "context": "MainActor, explicit class annotation",
      "evidence": [{"file": "App/Feature.swift", "line": 10, "endLine": 18}]
    }],
    "unknowns": ["Storage implementation has not been inspected."]
  }]
}
```

All fields shown are required. Evidence ranges are inclusive and relative to the
scanned repository. The renderer embeds actual source excerpts, read locally
after validation; an author's supplied excerpt is replaced. Use one journey per
documented creation site, with alternative paths described in its steps.
Task identity and context are plain-English labels, not compiler-derived facts.

Record trigger, ownership, awaited calls, state updates, errors, cancellation and
ordering when established. Put unresolved relationships and paths outside the
reviewed scope in `unknowns`. A journey may be partial: its scope must say so.
Do not represent an actor hop or ordinary await as a new task.

## Optional UI / Model separation gauge

Add a `separation` object with `complete` (boolean), `hasTestableModel`
(boolean), `rationale` (text), and `decisions` (array). Each decision requires
a unique `id`, `description`, `location` (ui, viewmodel, model or other),
`testable` (boolean), and source `evidence` ranges in the same format as steps.
One decision means one distinct product rule, not each conditional or call.
Exclude display-only rules. Classify a decision as testable only when it can be
exercised without constructing the UI.

Only set complete after reviewing the application's business decisions across
the requested whole-project scope and reconciling the skill's full-analysis
ledger. Keep `complete: false` during work. The legacy `ratingScope: reviewed-rules`
override is not permitted for a final skill-driven project dashboard. An unfinished
review must be labelled “Analysis incomplete — project ratings withheld”, with
specific missing work, not offered as a completed assessment.
After completion, the percentage is the count of testable model decisions divided
by all reviewed business decisions. No meaningful testable model boundary yields
zero. One or two isolated functions alone do not establish such a boundary;
explain this judgment in rationale. This score is a reviewed architectural
assessment, not an automatic scanner fact or a test-coverage measurement.

Architecture review displays these decisions by layer even for a partial review.
Each decision may include `testStatus`: `identified`, `not-identified`, or
`unknown` (default). `identified` requires a `testReference` naming the test
file and test function; add `testNote` to describe the assertions and review
scope. These are attributed review notes, not automatically verified mappings.
Use `not-identified` only after looking for a test; it does not prove absence.
Decision evidence is read from hash-checked source and its first line highlighted.
Choose the first line to locate the rule. Do not describe that highlight as
measured nonexecution. Presentation decisions are not business decisions.

## Measured Xcode test coverage

Enable code coverage in the Xcode test plan and run the app's tests. Export the
result bundle's measured line counts:

```zsh
xcrun xccov view --report --json /path/to/Tests.xcresult > /tmp/coverage.json
node src/cli.mjs /path/to/repository --out reports/with-coverage \
  --coverage /tmp/coverage.json --coverage-target 'YourApp.app'
```

Use the exact target name from the exported JSON. The gauge uses that target's
covered executable lines divided by executable lines, not an average of file
percentages or counts of test methods. A missing report omits the coverage card,
never fabricating 0%. The imported run may be older than the source; alignment is
explicitly unverified. No uncovered lines are attributed to current code from
this aggregate import. Test execution coverage does not establish assertion or
business-outcome coverage.

## Source alignment and journey coverage

The importer rejects mismatched fingerprints, missing site IDs, duplicate
journeys for the same site and invalid evidence ranges before writing a report.
The fingerprint covers the scanned Swift paths and contents, including dirty
edits. It does not cover project settings, external dependencies or excluded
files. Recheck those separately when interpreting isolation or live wiring.

Coverage is the number of unique scanned creation/framework-entry sites with
notes, not the number of fully traced tasks or a correctness percentage.
All remaining sites are listed. Validation proves structure and source alignment,
not that an observation is true. Notes are author-attributed, source-derived
observations, never runtime measurements.
