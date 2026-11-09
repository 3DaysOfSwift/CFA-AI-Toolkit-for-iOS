# Concurrency Migration Health Check

Use this read-only workflow to explain how an Xcode project actually uses Swift
Concurrency and assess whether its architecture combines conflicting models of
ownership, lifetime or coordination. It also works before or during a migration.
Do not assume a migration occurred unless history or the developer establishes it.

## Whole-app coverage is the default

A Health Check covers the whole application unless the user explicitly requests
one operation, screen or another bounded scope. Do not ask whether they want the
whole app checked, or silently replace that scope with representative examples.
A focused architecture review remains available when explicitly requested.

Build the operation inventory from all in-scope first-party production targets,
including extensions and local packages. Discover user actions and system entry
points: buttons, bindings that initiate work, navigation, launch, scene lifecycle,
deep links, notifications, background handlers, delegates, callbacks and observers.
Include synchronous operations; no Task is required for ordinary synchronous work.
Trace shared helpers once, then link every caller and inspect differences in its
inputs, state, cancellation and completion policy. Do not count helper methods as
separate user operations merely to increase coverage totals.

Give each meaningful action with a distinct result, failure, cancellation or
ownership path its own operation, even if it shares services with another action.
For example, setting, removing, loading and retrying reminders need separate
assessments. Group related actions under a capability in the report; reuse shared
source evidence only after reviewing the action-specific path. Do not combine
multiple actions into one generic verdict or manufacture separate operations for
identical presentation controls.

Maintain a ledger for every discovered entry point: source location, meaningful
operation, reviewed path, individual check results, and remaining work. Reconcile
it against the production target/file inventory and scanner candidates, and record
why an excluded candidate is not an operation. A scanner miss, unknown dispatch or
unavailable dependency must remain visible rather than disappear from coverage.
Whole-app source review is not proof of every possible runtime execution.

## Required app-level checks

In addition to tracing operations, assess each of these questions for the app as a
whole. Record the relevant source or measurement, a concise judgment and its
practical implication. Use Yes, No or Inconclusive when a yes/no answer is useful;
do not guess when the evidence cannot support a judgment. Surface meaningful
results in the report, rather than presenting scanner counts as findings.

1. **Deliberate concurrency:** Is there a recognisable policy for where work
   starts, who owns it, how results reach state and how lifetime is controlled?
   Trace multiple meaningful operations and distinguish intentional synchronous
   work from missing concurrency. Explain the policy or the inconsistency.
2. **Frankenstein architecture:** Do conflicting ownership, isolation or lifetime
   assumptions create an incoherent design? Trace task creation and callers,
   including migrations from queues when history is available. Replacing a queue
   with an unstructured task, nested tasks, mixed APIs or using `Task` on MainActor
   is a lead for investigation, not a defect by itself; `Task` alone does not
   guarantee work leaves the main actor. Apply the evidence-based verdict below.
3. **Discoverable capabilities:** Can developers find the app's business
   capabilities, their state owners and supporting services in the project?
   Inspect actual target membership, folders and wiring; assess discoverability
   without requiring CFA folder names or a particular number of Features.
4. **View and Model boundaries:** Locate business decisions, authoritative state,
   presentation state and UI code. Identify concrete cases where a business rule
   is coupled to a particular UI, and explain the resulting maintenance impact.
5. **Additional targets:** Assess whether existing business capabilities could be
   reused by another UI or extension. Inspect imports, target membership, platform
   availability, lifecycle, storage and process boundaries. A shared source folder
   or singleton alone does not prove code compiles in a widget, watchOS or another
   process. For an existing extension or companion app, trace how it obtains
   fresh data in its own process. For a snapshot-backed widget, verify the write
   completes before requesting a timeline reload. For a Watch companion, trace
   the transfer and check how the receiver handles missing, delayed or obsolete
   snapshots. Report build and device evidence separately from source review.
   For a proposed target, identify the code and dependencies that would need
   adaptation.
6. **Actor design:** Identify actors' state, responsibilities, callers and
   isolation boundaries. Examine unnecessary hops, reentrancy and overlapping
   ownership where evidence warrants it. Neither an actor count nor similar names
   establish misuse or justify merging; assess their actual invariants and roles.
   For networking, trace independent requests from their callers through the
   networking service to URLSession. Look for sequential awaits, explicit queues,
   shared task chains, blocking calls or expensive synchronous actor-isolated
   work that delays another request. Consider session connection limits and
   intentional rate policies. An actor serializes isolated execution between
   suspension points, but it may process another call while a request is
   suspended; an actor alone is not evidence that transfers cannot overlap.
   `@concurrent` is not a prerequisite for overlapping actor-initiated requests.
   Report a source-supported risk separately from a measured delay, and use a
   controlled overlapping-request test or profiling where practical.
7. **State observation:** Trace how a screen receives current state and updates,
   including identity, snapshots, actor boundaries, subscriptions and cleanup.
   Consider the product's intended freshness policy; a deliberately stable detail
   snapshot is not a defect merely because it does not update automatically.
   For an app-wide listener, trace startup, repeated startup signals, event
   forwarding and cancellation or replacement. Check that required events
   still reach the app with the relevant screen absent. In CFA, AppModel owns
   the listener and forwards events to the responsible Feature, which interprets
   them and owns the resulting state. Trace screen-only observation separately
   against the screen's lifetime.
8. **Launch performance:** Trace startup and its loading signals, then measure
   launch using available tooling when feasible. State the measurement definition,
   device or simulator, build configuration, cold or warm conditions, sample count
   and result. A launch command's success or a cache decoding benchmark is not an
   app launch time. If measurement is unavailable, state that plainly and never
   invent a duration; continue the source review and report useful findings.
9. **Cancellation:** For each relevant operation, determine who may cancel, whether
   cancellation propagates or is deliberately independent, and whether work and
   state commits respond appropriately. Check long loops and suspension boundaries
   where needed. Not every task requires an explicit `Task.checkCancellation()`:
   awaited APIs may cooperate, and some short or intentionally independent work
   need not cancel. Describe an actual consequence before classifying a problem.
10. **Mutable value copies:** Identify mutable value types that represent shared
    application data, and trace where copies are created, edited, retained and
    refreshed. Determine which owner holds the authoritative value and whether a
    retained copy can diverge or overwrite newer changes; describe the sequence
    and consequence with source evidence. Distinguish an intentional local editing
    draft or stable display snapshot from a second purported source of truth. A
    `var` property alone does not establish a synchronization bug. When checking
    CFA conformance, also assess published snapshots against CFA's immutable-value
    convention and report a deviation separately from a demonstrated defect.

Keep Swift Concurrency correctness, general architecture and optional CFA-specific
conformance distinct. An app can have a deliberate non-CFA design, and a CFA
layout alone does not prove concurrency correctness or runtime performance.

## Produce the Health Check report

Run the packaged scanner on the current checkout before each Health Check.
Run these commands from the architecture review skill directory, or use the
full path to its bundled script from another directory:

```
node scripts/dashboard/src/whole-app-health.mjs prepare <project-root> <new-inventory-directory>
```

Read `inventory.json`, `checklist.json` and `task-map.json`; record source-backed judgments incrementally in the generated `review-draft.json`. Run `node scripts/dashboard/src/whole-app-health.mjs next <project-root> <review-draft.json>` after each batch to list concrete pending files, entry points and task sites. Continue reviewing related operations and reusing shared-path evidence; do not stop after saving a checkpoint. The command does not itself inspect or assess the code. Use the checklist to cover source files, candidate entry points and task sites through meaningful operation batches and justified exclusions. Verify production target membership and add manually discovered operations. Continue until all applicable items are reconciled. SwiftSyntax records source locations,
enclosing functions and lexical nesting of explicit tasks. Lexical nesting is not
task parentage: nested `Task {}` creates independent unstructured work. Group
children, `async let` children and SwiftUI tasks need their own ownership review. Follow callers and
the compiler index where available; record each source-supported relationship in
the operation steps and each unresolved relationship as unknown. Never invent a
complete tree from syntax alone.

The prepare command also writes `project-analysis.json`, the shared evidence map
used by migration. If a suitable existing compiler index is available, add
`--index-store <path> --module <module>` after the inventory directory. Indexed
calls are build-specific leads whose freshness and completeness are unverified;
they do not establish task parentage or runtime execution. If the index cannot
be read, its unavailable status and reason remain in the analysis. Continue the
source review rather than treating absent indexed calls as proof of absence.

Reconcile the full production target and file list,
including sources the lexical scan cannot resolve. Check the directories listed
under `productionTargets.excludedTestDirectories` in the checklist against
actual target membership before confirming that they contain only test sources. If any such directory contains production Swift, run `prepare` again with `--include-tests` as the last argument. The new draft preserves that inventory scope for subsequent commands. Record verified test-only files in a separate file batch with source and membership evidence. Give their candidate entry points and task sites an explicit exclusion reason. Record evidence-backed file batches, detected candidate entry points and each meaningful user or system operation using `scripts/dashboard/Documentation/REVIEWS.md`. A shared helper can be reviewed once and linked from multiple operations after checking each caller. Individual type verdicts are optional. Include
`productionTargets` (an array of reviewed target and local-package names),
`targetInventoryVerified` (true only after verifying membership), and
`entryPoints` entries with each candidate `siteId` and either `operationId` or a
specific `excludedReason`. The matching operation evidence must include the
entry point. Reconcile every entry in `task-map.json` in `taskSites` using the
same `siteId` / `operationId` or `excludedReason` structure; operation evidence
must include the associated task site. Add a `presentation` object with app, summary, verdict, conclusion and
criteria for the concise report. Each criterion needs title, detail, status
(`pass`, `concern`, `problem`) and an `evidence` array of
`{file, line, endLine}` source ranges. Cite the code that supports the claim,
and carry confirmed operation problems into the visible findings. Map the
app-level assessments to visible criteria using each criterion's `appChecks`
array. Use the IDs `deliberate-concurrency`, `discoverable-capabilities`,
`view-model-boundaries`, `additional-targets`, `actor-design`,
`state-observation`, `launch-performance`, `cancellation`, and
`mutable-value-copies`. The report derives the structural-conflict verdict
from the operation checks. For launch performance, explicitly distinguish a
measured duration from a source assessment when timing is unavailable. Use the app's own PNG icon
when available. Keep the inventory and working review outside the app source tree. Save the final report in `reports/health-check/` at the app repository root, outside the app target’s source directory.

After review, run:

```
node scripts/dashboard/src/whole-app-health.mjs report <project-root> <review.json> <project-root>/reports/health-check/<new-report.html> [app-icon.png]
```

The tool reruns SwiftSyntax and rescans and checks the source fingerprint, evidence ranges, source file
coverage and candidate reconciliation before generating the report. Missing
reviews, unresolved operations, skipped files or unverified target membership
prevent report generation. Use the command’s diagnostics to continue the checklist;
do not bypass the gate or claim completion from counts alone. If evidence cannot be
obtained, report the blocker to the user without generating an overall health score.
The scanner is lexical: a complete result also requires the reviewer to find
entry points it cannot detect, resolve target membership, and assess call paths.
Never infer a complete app assessment from a matching count or scanner output.

## Review operations in batches

For shared refreshes in a CFA app, apply the
[shared refresh rule](spec/rules/cfa-task-02.md). Verify the task owner and
trace the last screen leaving, another waiter remaining and a later caller
joining or reading the result. If a screen requires prompt cancellation,
verify that its wait can end while the Feature's task continues. For non-CFA
apps, assess the intended lifetime and its effects using the app's own policy.

Inventory every in-scope production Swift file, including files without type declarations. Group related screens and shared services into meaningful operations; inspect their files and reuse shared-path evidence after checking each caller. Record each inspected file in an evidence-backed batch. Review state ownership,
isolation, task lifetime, overlapping work, cancellation, error handling and
observable results where applicable. A synchronous file is not a failure. Record
one of: no problems found in the reviewed behaviour, problem, needs investigation,
or not assessed. A green result requires completed, evidenced checks; a scanner
match count or absence of concurrency syntax is not a pass. Follow callers and
dependencies when behaviour cannot be judged in isolation. Do not create a separate verdict for every type merely to satisfy the inventory.

For every operation, complete the four source-backed timing scenarios defined in
`scripts/dashboard/Documentation/REVIEWS.md`: repeated triggers, caller departure,
older results arriving late and failure. Mark irrelevant scenarios not applicable
with a reason the reader can understand. The report preserves these reasons
in a collapsed section within the workflow and counts only applicable checks
toward its concurrency result. Explain actual outcomes, ownership and
consequences. Distinguish
source reasoning from tests that were actually run. Newly prepared reviews require
these assessments before the final report can be generated.

The developer may explicitly accept a documented problem. Record who accepted it
and why; preserve the original problem and evidence rather than marking it green.
Do not infer acceptance from silence. A problem or accepted issue does not block
operation tracing: the interactions may expose its severity or contradict it.

Next map each discovered operation from its actual user or system event. For
each source-supported step, record whether it is synchronous or in the same
task, a structured child task, an unstructured task, a framework-owned task, or
an unknown relationship. `Task {}` creates an unstructured task even inside
another task; an `await` alone is not a new task. Include operations that never
create a task. Describe unresolved dynamic dispatch and external boundaries;
neither lexical nesting nor a scan proves a call graph or runtime execution.
Each operation needs a source-backed trace before rendering. Cite assigned task
sites both in the operation evidence and in the step that explains how the work
runs. A task that also triggers the operation has an event step and an execution
step. Link findings and accepted decisions to the affected operations.

Partial reports are checkpoints. Continue through the remaining inventory while
source and review actions are available. A demonstrated defect may establish a
verdict early, but does not complete the rest of the app's review. Finish with one
consolidated report once the identified operations and workflow traces pass the
completion checks. If unavailable evidence prevents finishing, keep the checkpoint
for resumption and describe the specific blocker in the handoff.

## Keep the assessment on course

The deliverable is an evidence-based architecture report. A successful build,
passing tests or a simulator launch is supporting evidence, never completion of
the health check.

Maintain a compact checkpoint in the local report draft outside application
source: requested scope and revision, operations traced, findings and
counterevidence, pending checks, and the next review action. Update it after each
substantial operation trace and before switching to optional runtime checks.
Preserve its location in any handoff or context summary. On resuming, read the
checkpoint and continue the pending assessment; do not restart completed work or
replace the assessment with the last tool's subtask.

After a build, test or simulator attempt, record what it actually established and
return to the next pending review action. A launch command succeeding does not
establish that the app remained open, and neither establishes architectural health.
Status questions and requests to launch the app leave the assessment pending
unless the user explicitly changes or cancels its scope.

For a transient read or execution failure, retry at most twice when another attempt
could help and remains within the authorized scope. Then use an available
alternative or record the missing evidence and continue independent source review.
Do not loop on the same failure, repair application code, change permissions or
repeat state-changing operations merely to obtain a successful check. If essential
evidence remains unavailable, deliver an Inconclusive report identifying the gap.
Respect a user's pause or cancellation immediately.

When tests run, inspect the command exit status and the complete Xcode result
bundle, including failures from earlier attempts. A final console suite may be
only a retry subset. Do not report a clean run from that subset or erase a
failure because a rerun passed. Explain the cause and preserve regression evidence.

Before ending, check that the response contains the scoped Yes / No / Inconclusive
verdict, status rows, operation map, findings (or an explicit statement that none were found),
evidence and coverage limits, and next actions. Provide the saved report's path.
If these are missing and useful review work remains possible, continue the review
instead of returning a launch or test-status message as the final answer.

These checkpoints support continuation while the assistant is running or when it
is resumed. Skill instructions cannot restart an ended turn or recover a lost
connection themselves; automatic resumption requires a host-supported mechanism.

## What counts as Frankenstein architecture?

In this review, **Frankenstein Architecture for iOS** means incompatible design
assumptions stitched together without coherent state ownership, work lifetime or
behaviour. New syntax alone does not establish a new concurrency model.

Mixed GCD and Swift Concurrency, callbacks, Combine, locks, singletons, multiple
actors, a large ViewModel or an architecture other than CFA are not evidence by
themselves. A well-contained callback adapter can be a coherent boundary. An
isolated bug is not automatically an architectural diagnosis.

## Establish the scope and execution model

### Use the bundled analysis tool

Use the local dashboard tool by default when available and the project contains
Swift Concurrency. From the skill directory, run
`node scripts/dashboard/src/cli.mjs --help`, then generate a baseline with
`node scripts/dashboard/src/cli.mjs <repository> --out <new-report-directory>`.
Keep output outside application source. If Node.js or the tool is unavailable, or
the project is legacy-only, record that limitation and continue manual review.
Do not install dependencies or change the app merely to run the scanner.

Read the bundled `scripts/dashboard/Documentation/OBSERVATIONS.md` and
`scripts/dashboard/Documentation/REVIEWS.md` before authoring import files.
Use the baseline's exact source fingerprint and site IDs. Trace source and live
wiring to author task journeys, task-lifetime reviews and concurrency checks;
the scanner does not discover complete execution paths automatically. Import
these with `--observations` and `--review` into a new output directory. Re-scan and
reconcile evidence if source changes; never bypass fingerprint validation.

Maintain a coverage ledger linking scanned creation sites to reviewed journeys,
findings or an explicit unresolved boundary. Supplement the scan with wrappers,
callbacks and relevant paths that lexical matching missed. Documenting a site is
not proof that every branch or runtime instance was reviewed. Preserve unknown
dispatch and external framework boundaries rather than inventing complete paths.

Deliver the status-row assessment alongside the source-linked dashboard and
journeys. The assessment explains the design; the dashboard lets the reader
inspect its evidence. Inspect the rendered output for readable rows and working
source links. Do not substitute a bare scanner dashboard for a completed health
check. This mode does not require numerical ratings; a separately requested full
dashboard follows the full dashboard workflow and its coverage requirements.

Identify the revision and local changes, production targets and extensions,
relevant packages, supported OS versions, Swift language mode, default actor
isolation and enabled concurrency features. Read effective build settings where
available; record unresolved settings instead of assuming compiler semantics.
Exclude generated and third-party code from first-party counts, but trace across
those boundaries when their contracts matter.

Inventory concurrency entry points and their callers: Task creation and detached
tasks, async let, task groups, SwiftUI task/refreshable modifiers, actors, global
actors, async APIs, continuations, AsyncSequence consumers, queues and callback
bridges. Read implementations and live dependency construction. The bundled
scanner can locate candidates; its counts and warnings cannot decide the verdict.

Record an operation map with each trigger, state owner, task/lifetime owner,
isolation, result/cancellation policy and source evidence. Keep this detailed map
after the reader-facing status rows. Prefer short per-operation blocks over a
wide table when the ownership paths need substantial explanation.

Distinguish task creation from awaited calls in an existing task, source sites
from runtime task counts, actor isolation from threads, and data-race protection
from correctness across suspension points. An async declaration or separate type
does not establish that CPU-intensive work executes away from MainActor. Consult
the project's toolchain and authoritative Swift documentation when semantics are
uncertain; do not impose another compiler version's defaults.

### Review the launch signal

Trace each applicable app and scene lifecycle entry point from its synchronous
callback to the initialization and loading signals it actually invokes. Show
where the callback returns, which essential startup signals run synchronously,
and which are first scheduled in a Task, queue, View lifecycle or another
asynchronous mechanism. For this health check, the toolkit's preferred launch
policy is to signal initial application loading synchronously from the applicable
lifecycle callback; the receiving owners may start their own asynchronous work.
Identify a deferred initial signal as a departure from that policy and highlight
the exact source path to the team, including its ownership and ordering effects.

For CFA targets, follow the direct AppModel call through Feature startup and
the start of any required app-wide listeners before the callback returns. Check
that repeated startup signals do not create duplicate listeners. Trace events
to the owning Feature when no relevant screen is visible. Record this lifecycle
evidence separately from any startup timing measurement.

Apply this review to CFA and non-CFA apps without requiring any particular
architecture, AppModel name or launch delegate. First establish which work the
app actually needs at launch and whether the callback applies to that target or
scene. A Task is not automatically a Swift Concurrency error or evidence of a
measured slowdown; a deliberate deferral may fit the product. Distinguish the
synchronous signal from completion: do not require the callback to wait for
network requests or perform blocking disk I/O. Describe a concrete consequence
or mark it unverified, and measure on a representative device before claiming a
launch-time difference. If the lifecycle path cannot be established, mark the
check as needing investigation rather than guessing.

## Trace behaviour before judging it

First map the application's capabilities and their authoritative state owners,
using actual responsibilities rather than folder names or a required Feature
suffix. Identify View, screen coordination and model boundaries. For each important
business rule, locate its implementation and explain whether it can operate
without constructing UI. Check whether ViewModels arrange existing capabilities
or implement business policies that deserve a model owner.

Inspect SwiftUI View bodies, actions and initializers. Distinguish ordinary
presentation logic and delegated button actions from embedded business rules,
persistence and multi-step operation coordination. For CFA projects, check inline
private ViewModel ownership and forbidden initializer injection; in other
architectures, explain the actual lifetime or ownership consequence rather than
marking injection as a concurrency defect by itself.

For every reviewed journey, connect the trigger to calls, state commits and
completion. Identify existing-task execution, new unstructured roots, structured
children and actor transitions separately. Explain why the chosen lifetime and
isolation fit the operation. Compare policies across capabilities: consistent
ownership need not mean identical mechanisms everywhere. Flag incompatible
assumptions with a concrete failure sequence, not merely a mixture of APIs.

Follow every inventoried operation from user or system trigger through business
logic and services to final state mutation or completion, including synchronous
paths and the distinct coordination mechanisms. Shared-path evidence may be
reused only after checking the caller-specific contract. Unreviewed operations
remain pending and preclude a completed whole-app assessment.

For each relevant operation, inspect:

- Repetition and ordering: overlapping refreshes, changing search queries, writes
  and pagination. Who decides whether to deduplicate, replace, queue or combine?
- Lifetime: navigation away, observation ending, sign-out and account changes.
  Work may intentionally outlive a screen; establish its owner and purpose.
- Background work: trace the system registration, scheduling request, delivery
  callback and owning operation. For BGTaskScheduler, verify that each permitted
  identifier is registered once before launch returns. Follow expiration through
  cancellation and completion, and check that normal completion and expiration
  cannot both report completion for the same delivery. Distinguish source evidence
  from device evidence about whether the system actually delivers the work.
- Account transitions: trace a request started in one session that completes
  after sign-out or after a different account signs in. Locate the account
  or session-generation check at publication, or establish how the design
  prevents the stale result from reaching the current account. For CFA,
  distinguish a failed sign-out that leaves the session intact from a partial
  authentication change that requires checking the actual session state.
- State authority: which object accepts results and controls mutations? Look for
  independent writers or conflicting cached state, not harmless value snapshots.
- Suspension: what assumptions can change during await? Trace validation and
  commit, actor reentrancy, stale results and cleanup of replaced task handles.
- Optional download caches: when CFA applies, verify that a slow restore does
  not delay the remote request and that a restore arriving after a successful
  download cannot replace fresh data. Follow refresh through the caller's
  completion as well as publication. A pending or failed optional write must
  not hold the caller open or turn a successful refresh into a failure. Trace
  overlapping cache writes to check that an older write cannot replace a newer
  snapshot and that a failed replacement leaves the previous cache usable.
- Operation results: trace how a caller identifies the record its operation
  created. Comparing a shared collection before and after an await can select
  another caller's insertion, even when persistence itself is serialized.
  Prefer an identity or value returned by the operation that performed the write.
  Check overlapping commands with different inputs and ordering: both records
  may persist correctly while the callers receive the wrong assessment, receipt
  or navigation destination. A successful write alone does not verify its result.
- Derived results: include charts, streaks and other calculated snapshots. A single
  MainActor owner can still publish an obsolete calculation after an await. Check
  the empty-input fast path too: a newer empty result may finish before an older
  nonempty calculation. Require an ordering policy at publication, not merely
  actor isolation or immutable inputs.
- Failure and cancellation: errors reaching the caller, cleanup, cancellation
  propagation through bridges and continuation completion on all relevant paths.
  Cancellation is cooperative; cancelling a request alone does not prove a stale
  result cannot commit. Check identity/generation or equivalent ordering logic.
- Cancellation before side effects: a check before an await does not cover
  cancellation during that await. Trace the interval between preparation or access
  checks and starting a payment, write or other external effect. Check cancellation
  again at the dispatch boundary when the operation is meant to stop. For queued
  work, inspect cancellation after admission and before performing new I/O.
  Distinguish this from a write that has already succeeded: suppressing publication
  after a durable commit can leave application state inconsistent with storage.
  Establish the operation's intended policy; do not require every shared or
  app-owned operation to stop when one caller cancels.
- Responsiveness: blocking waits and expensive processing on an executor needed
  by other work, including MainActor. Measure before asserting a measured slowdown.

For every suspected defect, construct a concrete event sequence and check the
full path for an existing guard, serialized policy or framework guarantee that
invalidates it. Separate a source-supported possibility from a reproduced failure.
Read applicable tests and run focused existing tests when feasible; do not edit
the app or trigger production operations to demonstrate a problem. Propose missing
tests without claiming they passed. Report build/test failures separately.

## Give a direct, evidence-based verdict

Lead with **Frankenstein architecture detected: Yes / No / Inconclusive** and
the reviewed scope. Do not invent a numerical score or convert lexical counts
into a verdict.

- **Yes:** demonstrate conflicting architectural assumptions in a live operation,
  identify the competing owners or coordination policies, and show the resulting
  failure sequence. Explain why the finding is structural rather than merely a
  local mistake. A critical shared path can justify Yes without an arbitrary
  minimum finding count. Do not generalize beyond the demonstrated scope.
- **No:** no such conflict was detected after tracing the stated scope. Describe
  the coherent ownership and coordination found. This does not certify freedom
  from bugs. Ordinary defects may still appear separately in the findings.
- **Inconclusive:** essential source, wiring, settings, contracts or review
  coverage is missing. Say precisely what is needed to decide. If a conflict is
  already demonstrated, report Yes for that path and leave other areas unassessed.

Deliver the verdict, operation map, prioritised findings and next actions. Each
finding includes file/line and symbol, evidence level (source-supported or
reproduced), trigger sequence, consequence and smallest proportionate repair.
Include counterevidence where it narrows a finding. Separate correctness issues,
maintenance concerns and optional CFA recommendations. Non-CFA projects need not
adopt AppModel, feature naming, View construction rules or MainActor-owned Features
to receive a No verdict.

## Make the report useful at a glance

Write the verdict card as a concise, evidence-backed assessment of the app’s
architecture and Swift Concurrency: what works well and any material concern.
Describe the app, not the review process. Do not use the card for commit hashes,
scan coverage, test counts, inventory status or work remaining. Keep supporting
evidence with the relevant findings; do not imply unreviewed code was assessed.
The `presentation.verdict` field is required and supplies this card text; do not
copy the review scope or a procedural summary into it.

Record CFA-only deviations in the CFA alignment checks. The workflow row
labels the deviation separately from its concurrency result. Use the overall card
and its criteria to assess Swift Concurrency and architectural clarity. A
confirmed defect keeps the Result at **Needs attention** even when the
numerical score is high. Use the separate Frankenstein verdict to identify
an evidenced architectural conflict. A local defect alone does not establish
that verdict.


Immediately after the overall verdict, show concise assessment rows with a leading
status symbol and written label. The reader must be able to distinguish what works,
what is wrong and what needs investigation without interpreting an ownership map.

- **✅ Stable:** a traced mechanism supports the stated behaviour. Name the
  protection and its practical benefit; absence of scanner warnings is insufficient.
- **❌ Problem:** source evidence or an executed check demonstrates a defect or
  conflicting design. State the consequence and severity. Label a structural
  conflict **Architectural conflict** and explain which assumptions contradict each
  other; label an isolated defect **Local defect** rather than calling it Frankenstein.
- **⚠️ Needs investigation:** a suspicious pattern or maintenance concern needs
  clarification. Explain what is strange and what evidence would resolve it.
- **➖ Not assessed:** evidence or coverage is missing. Never turn an unreviewed
  area into a green tick.

Use three compact columns: **Assessment | What this means | Evidence**. Begin each
assessment with its symbol, label and a short concrete conclusion. Keep the meaning
to one or two sentences. Link concise filenames and line numbers to detailed
evidence; do not put long filesystem paths or paragraphs in narrow columns. For
HTML reports, use readable stacked rows on narrow screens and retain text labels
so meaning does not depend on colour. Put demonstrated problems first, followed by
concerns, strengths and coverage gaps. Do not manufacture problems for balance.

Assess state ownership, task lifetime, overlapping results, actor reentrancy,
cancellation/errors, legacy bridges and responsiveness where applicable. A single
operation can have a green result-ordering check and a red lifetime check; avoid
giving an entire feature a blanket tick that hides a specific defect. Distinguish
source-supported strengths from runtime-tested behaviour.

Below these rows, explain each red or amber finding with the relevant code excerpt,
failure sequence and smallest useful correction. Explicitly answer whether it
contributes to the overall Frankenstein verdict. Judge the code's conflicting
assumptions and consequences, not the engineer's competence or intentions.

Keep the report local in `reports/health-check/` at the repository root, outside application source. Never publish source or
migration evidence as part of a health check. Capture reusable case studies only
when separately authorized, using the toolkit's migration evidence workflow.
This health check supplies review guidance, not an automatic semantic detector.

### Opening operation assessment

Populate the review input's `operationInventory` and `operations` using
`scripts/dashboard/Documentation/REVIEWS.md`. This is the report's opening view.
Enumerate meaningful UI actions and lifecycle/background entry points, including
synchronous paths with no Task. Include unassessed rows rather than silently
omitting discovered operations. State the discovery method and whether inventory
coverage is partial or complete.

Trace what the current code actually does: trigger, calls, authoritative state
owner, task lifetime and actor boundaries. Link source evidence for each claimed
boundary. Assess correctness and architectural clarity separately; classify a
confirmed problem as a local defect or architectural conflict. Put proposed fixes
only in recommendations. Do not substitute the intended CFA design for observed
behavior. Record unresolved boundaries and avoid green verdicts until resolved.
Reanalyse and refresh judgments when source changes; saved reports are snapshots.

Use individual `checks` for every newly assessed operation (see REVIEWS.md).
Do not use a generic unresolved verdict merely because runtime tests were not
run. A source-established ownership property may pass while cancellation remains
unresolved. Every unresolved check must name its specific question and how to
resolve it. Every failure must describe the triggering condition and consequence.
Preserve verified passes beside failures or unknowns. Keep CFA deviations in the
separate CFA dimension; they do not establish concurrency defects. Reinspect old
coarse reviews before translating them into individual check verdicts.
