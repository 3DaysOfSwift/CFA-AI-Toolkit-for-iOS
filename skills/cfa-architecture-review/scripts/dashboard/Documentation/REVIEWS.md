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

`findings` and `testQuality` are optional. Whole-app Health Check findings use `pass`, `concern` or `problem`.
Use `problem` for a confirmed defect. Each report criterion needs at least one
structured evidence reference with a file and line range. Each confirmed source problem, including
individual file or type issues, failed operation correctness or clarity checks,
and timing-scenario problems, must have at least one complete cited source
range included in a visible problem criterion. Source findings marked
`concern` likewise need a complete cited range in a visible concern or problem
criterion. Partial overlap is insufficient. Workflow rows show a concurrency result from their behaviour checks
and timing scenarios. A failed CFA check adds a CFA deviation label to the
workflow row. Its evidence remains in the expanded CFA alignment section,
and the deviation does not change the row's concurrency result. The location
check cannot establish that the prose describes the same issue. `scenarios` must have unique titles
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
`startTime` in the supported date range. Counts must sum to the total. The
gauge divides passed tests by the total, including skips. An empty run has no
percentage, and an all-skipped run is labelled separately. An overall Xcode
failure remains visible even if every reported test passed. The panel shows
that alignment with the scanned source is unverified. Import xccov separately
to see measured line coverage.

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
isolation and lifetime boundaries in `unknowns`. For individual checks, mark the
affected property unresolved while retaining independently verified passes. The importer reloads excerpts from the source; it does not verify the
reviewer's reasoning or prove a complete call graph.

Inventory coverage is `partial` or `complete`. A complete inventory requires
an explicit discovery method and all identified entry points, including rows
that remain unassessed. Missing or incomplete assessments produce an inconclusive
overall result. A local defect alone does not establish an architectural conflict.
Regenerate the analysis and refresh the review after changes to scanned Swift
files or local build definitions, including target membership changes. The
inventory lists fingerprinted build and capability files under
`scope.buildDefinitionPaths`. The whole-app checklist lists the same paths
under `productionTargets`. Use these paths as leads when verifying target
membership and effective build settings. In the app-level `additional-targets`
assessment, record which shipping targets and local packages were checked,
how source membership was confirmed, and why any test or support sources were
excluded. Cite the build definitions that establish membership where they are
available as UTF-8 text. The `targetInventoryVerified` flag records the
reviewer's confirmation. The report command validates the record and source
fingerprint, so confirm effective membership independently of that flag.
Binary configuration remains part of the fingerprint and can be inspected
separately. The inventory lists symbolic links it encountered under
`scope.symbolicLinkPaths`. The scanners do not follow them. Check whether
a link refers to shipping source or configuration before confirming target
coverage. While membership is unverified, `next` returns these links, build
definitions and excluded test directories under `targetReview`. Use them to
locate evidence for the actual target membership. Retargeting a listed link
invalidates the review. Changes inside
its destination are tracked only if the destination is independently scanned.
An exported HTML file is a dated
snapshot.

Use one operation for each meaningful action with a distinct behavioural path;
shared code can be cited by several operations after each caller is checked. Set
the optional `group` text to the capability name, such as `Reminders`, to display
related actions together. Do not collapse setting and removing a reminder into
one verdict just because they use the same Feature.

### Test-named source directories

If a directory listed under `productionTargets.excludedTestDirectories`
contains shipping Swift source, prepare a new inventory with
`--include-tests` as the last argument. Review the shipping files and their
operations normally. Group verified test-only files in a separate
`fileBatches` entry. Cite each file and record the target-membership evidence
and reason for excluding it from the production assessment. For detected
entry points and task sites in those files, provide a specific
`excludedReason` instead of assigning a production operation. A directory
name alone cannot establish membership.

### Individual checks

New health checks supply an operation's `checks` array. Each check has `id`,
`title`, `dimension` (`correctness`, `clarity`, or `cfa`), `status`, `reason`,
`verification`, and its own source `evidence`. Status is `pass`, `fail`,
`unresolved`, `not-checked`, or `not-applicable`. A source-inspection pass applies
to the property inspected; it does not claim runtime testing.

Include these correctness check IDs: `state-ownership`, `actor-isolation`,
`task-lifetime`, `repeated-requests`, `cancellation`, and `errors`. Include
`architectural-clarity` in the clarity dimension. For an irrelevant check,
use `not-applicable` and explain why. Keep the check in the review record.
A correctness or clarity dimension with no applicable checks remains
unassessed and cannot close a whole-app review.

For `actor-isolation`, trace where the substantial work executes and where
the result is published. Record the relevant target's Swift language mode,
default isolation and SDK annotations when they affect the result. A type
name, an actor count or an async declaration alone does not establish the
execution boundary. When a responsiveness conclusion depends on timing,
record a measurement separately from the source trace.
When assessing CFA conformance, verify that the Feature owns authoritative
state on MainActor and that networking, storage and expensive processing use
an appropriate isolation boundary off MainActor by default. Check that any
framework-required MainActor call is confined to a narrow adapter. Keep the
CFA conformance finding separate from any demonstrated concurrency defect.

### Timing scenarios

Every new whole-app report requires timing assessments. For each operation,
record a `scenarios` array containing the four IDs `repeat`, `leave`,
`late-result` and `failure`. Each entry has `id`, `title`, `status` (`pass`,
`problem`, `unresolved`, or `not-applicable`), `outcome`, `verification`, and
source `evidence` using the same checked file and line references as other review
items. A `problem` also needs a `consequence`. Explain why a scenario is not
applicable when appropriate; do not invent an issue or runtime result. Unresolved
or missing scenarios block a new whole-app report until assessed. When resuming an older review, add missing scenario assessments before
generating a new whole-app report. Any existing flag is ignored.

For a shared refresh, distinguish the caller's wait from the operation's
lifetime in the `leave` scenario. For CFA's default policy, cancel the only
screen waiter and verify the Feature completes the refresh and retains the
result without a replacement waiter. Separately, join a later equivalent
caller while the refresh is suspended. Verify one underlying request and the
same outcome for the remaining callers when another waiter leaves. Where a
screen needs a prompt exit, verify that its wait ends while the refresh is
still suspended. For other architectures, judge the observed behaviour
against the app's ownership and cancellation policy.

For a durable edit, distinguish discarding an unsaved draft from leaving
after the operation is accepted. In the `leave` scenario, record whether
the accepted save continues and how confirmed state reflects a completed
write when its caller has left. In the `failure` scenario, trace what
happens to the confirmed value and draft and whether the user can retry.
Evaluate these outcomes against the operation's ownership policy.

For commands that must each take effect, suspend the first admitted command
and submit more, including two with identical inputs. Verify each required
command executes in admission order and each caller receives its own outcome.
Fail the first command and verify the queue still processes the rest. Compare
the resulting state with the outcomes reported to callers.

Trace repeated triggers, navigation or caller departure, older results arriving
late, and failures through the actual state and task owners. Record the observed
policy, test or reproduction separately from source-only reasoning. The report
shows the operation's behavioural checks and applicable scenarios with their
evidence. The workflow also has a collapsible section for inapplicable
timing scenarios and their reasons. They do not count as passes. The tool
validates provenance and completeness; the reviewer verifies the conclusions.

Use `unresolved` when the review has a specific unanswered question. Supply
`question` and `resolveBy` with the evidence or test needed. Use `not-checked`
for an applicable check the reviewer has yet to assess. Use `not-applicable`
only when the reason explains why the check does not apply.
A failed check needs a concrete `consequence` and a `problemKind`. Use
`local-defect` or `architectural-conflict` for correctness or clarity failures,
and `cfa-deviation` for failures in the `cfa` dimension. CFA-only failures leave
concurrency and architectural-clarity verdicts independent. An unresolved or
unchecked CFA item still keeps the whole-app review open. Once verified, a
CFA deviation appears under CFA alignment on the affected operation. A
convention difference alone does not require a Swift Concurrency problem
criterion. If the same route also has a confirmed behavioural defect, record
that separately under correctness or clarity with its own consequence and
source evidence, and include it in the report criteria.

The importer derives operation correctness and clarity from these checks. An
unresolved check preserves all other verified passes; row summaries show their
counts. Legacy reviews without checks retain their original coarse assessments.
Do not automatically convert their general positive descriptions into passes:
reinspect the source and attach evidence for each property.
# File and type reviews

The baseline lists every scanned Swift file and lexical type declaration as
unassessed. Add optional `fileReviews` and `typeReviews` arrays to the existing
review input (with its matching `sourceFingerprint`, `scope` and `author`):

```json
{
  "fileReviews": [{
    "file": "App/FeedFeature.swift", "status": "problem",
    "reason": "An obsolete result can replace a newer result.",
    "verification": "Source review; runtime behaviour not tested.",
    "evidence": [{"file": "App/FeedFeature.swift", "line": 1, "endLine": 20}]
  }],
  "typeReviews": [{
    "file": "App/FeedFeature.swift", "line": 1, "kind": "class",
    "name": "FeedFeature", "status": "problem",
    "reason": "An obsolete result can replace a newer result.",
    "verification": "Source review; runtime behaviour not tested.",
    "evidence": [{"file": "App/FeedFeature.swift", "line": 1, "endLine": 20}],
    "acceptance": {"by": "Developer", "reason": "Accepted for this release."}
  }]
}
```

Status is `sound`, `problem`, `investigate` or `unassessed`. `sound` means no
problem found in the reviewed scope, not a proof of correctness. Acceptance is
optional, requires an explicit developer decision and a `problem` status, and
does not erase or convert the finding. Type identity must match the scanner's
file, declaration line, kind and name. Its evidence must contain the declaration.
The importer checks source hashes and locations, not the truth of the review.
For multiple problems, a `problem` review can include `issues`: an array of
objects with `title`, `detail` and source `evidence` for each distinct issue.

Every whole-app Health Check operation needs an ordered `steps` array. A
synchronous action can have a single event step if it completes there. Every step has
`id`, `title`, `relation`, `detail` and source `evidence`. The first step is an
`event` with no parent; later steps have `parentId` referencing an earlier step
and relation `same-task`, `child-task`, `unstructured-task`, `framework-task`,
or `unknown`. These are reviewer-authored relationships, not an inferred call
graph. Cite each task site assigned to an operation in that operation’s workflow
steps as well as its overall evidence. After confirming the scanner candidate,
use `unstructured-task` for Task and Task.detached, `child-task` for async let
and task group children, `same-task` for the task group scope itself, and
`framework-task` for SwiftUI task and refreshable callbacks.
If the written name resolves to a different API, record the candidate with an
`excludedReason` that identifies the actual declaration or receiver. For
example, a custom queue's `addTask` method need not create a structured child.
Still trace the call's actual behaviour in its operation when it is in scope.
When a task site is also the trigger,
cite it in both the event step and a subsequent step that explains how the
work runs. Include synchronous events and preserve unknown boundaries.

## Whole-app Health Check file batches

Record related files once in `fileBatches`: each batch has `title`, `files` (an array of repository-relative Swift paths), `reason` (what was inspected), `verification` and `evidence` (source references including at least one reference in each listed file). The reviewer must actually inspect each file and trace relevant behaviour; evidence validation only checks provenance. A file may appear in only one batch. Existing `fileReviews` are still accepted. Individual `typeReviews` are optional. Reuse shared-service evidence across the operations that call it, after checking each caller's behaviour. Reconcile all detected entry points and task sites and manually discover additional operations before claiming a whole-app review.

## Whole-app report criteria

In `presentation.criteria`, give each visible criterion a `title`, `detail`,
`status` (`pass`, `concern` or `problem`), and source `evidence` ranges.
Use `appChecks` to name the app-level questions the criterion actually answers.
Across all criteria, cover these IDs:

- `deliberate-concurrency`
- `discoverable-capabilities`
- `view-model-boundaries`
- `additional-targets`
- `actor-design`
- `state-observation`
- `launch-performance`
- `cancellation`
- `mutable-value-copies`

A criterion can cover several questions when its detail and evidence address
each one. For launch performance, report the measurement conditions and result
when available. Identify the device or simulator, build configuration, cold
or warm launch, and what the measurement ends at. Report first-frame timing
separately from disk restoration or Feature refresh completion. Otherwise,
describe the startup path and state that timing was unavailable.

The inspector flags some direct synchronous reads and file opens in the
delegate callback, AppModel construction and the launch signal. Trace branches
and helper calls on the synchronous launch path to check for other blocking
I/O. Identify work started inside a Feature-owned task separately from work
the delegate waits for.

Check that each active SwiftUI scene can install its normal root while
Features start or recover from failure. The inspector can trace roots directly
constructed by a WindowGroup, including value-driven groups, and flag possible
startup gates in App.body or the root. Confirm which compilation branch and
target contain the finding. Follow helper-built roots and verify whether an
early return actually prevents navigation or access to unaffected destinations.

When reviewing CFA conformance, record whether AppModel signals Feature
startup and creates and retains required asynchronous listener tasks before
the launch callback returns. Record event consumption separately from task
creation and launch timing. With a controlled source, signal launch more than
once and verify that one listener forwards events to the owning Feature
without a relevant screen mounted. For a replaceable listener, check that
cancellation stops the old listener from forwarding events and that delayed
cleanup leaves the replacement active. Screen-only observation follows the
lifetime of its screen or ViewModel.

The structural-conflict verdict comes from the classified operation
checks. For an older review, update its findings and add the corresponding
`appChecks` before regenerating the report. Use `progress` or `next` to list
missing questions before rendering.

When the app uses system background work, trace once-only registration during
launch, separate scheduling, and delivery to the owning Feature. Record
controlled evidence that expiration cancels the work and that success, failure,
and expiration each complete the system callback once. Include the race between
expiration and normal completion. Record actual background execution on a
supported device separately. A controlled handler test establishes how the app
responds when called by the system.
