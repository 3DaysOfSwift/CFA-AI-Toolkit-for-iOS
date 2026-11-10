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
   or singleton alone does not establish target compatibility. For an existing
   CFA widget or device target, apply the [multi-device rule](spec/rules/cfa-device-01.md).
   Verify that each target includes the shared Model and only its own Views
   and ViewModels. Trace each process's AppModel composition and confirm that
   platform-specific dependencies leave business rules shared. Check a build
   of every affected target and trace how each consumer obtains fresh data.
   For an App Group widget snapshot, verify that the write completes before
   the app requests a timeline reload and that a failed write issues no reload
   request. On a supported device, verify that the widget reads the new
   snapshot and presents its value when WidgetKit next runs the timeline.
   A reload request alone establishes only that the app asked for an update.
   For a Watch companion, trace the
   separate snapshot transfer to the receiving Feature and verify that it updates
   its observable state. Check missing, unreadable, delayed and stale snapshots.
   Where multiple targets can edit the same data, exercise the product's
   conflict policy. Report source review, builds, controlled tests and
   supported-device results separately. For a proposed target, identify the
   code and dependencies that would need adaptation.
6. **Actor design:** Identify actors' state, responsibilities, callers and
   isolation boundaries. Examine unnecessary hops, reentrancy and overlapping
   ownership where evidence warrants it. Neither an actor count nor similar names
   establish misuse or justify merging; assess their actual invariants and roles.
   Resolve isolation for the target and build configuration being reviewed.
   Account for the Swift language mode, default isolation and SDK annotations,
   including inferred isolation and protocol requirements. For a CFA project,
   check that every Feature is MainActor-isolated, including Features without
   a screen. Trace synchronous work in Features, ViewModels and their
   services before and after suspension. For example, a Feature can await a
   download and then decode the response on MainActor. Identify the isolation
   of the decoding call and the input it handles. Apply the
   [isolation rule](spec/rules/cfa-conc-01.md) to expensive processing. Report a
   source-supported risk separately from a measured UI delay. Treat missing configuration or
   unresolved dispatch as an evidence gap and keep CFA conformance separate
   from concurrency correctness. Trace values and closure captures across
   isolation boundaries. For a mutable reference declared `@unchecked Sendable`,
   identify the documented safety invariant and verify it against reads and
   writes on both sides of the boundary. For CFA SwiftData, locate the
   SwiftDataManager and the context owner. Verify that non-trivial production
   work uses a dedicated `@ModelActor`, keeps its context and live records
   within the storage boundary, and returns immutable Sendable values to
   the Feature. Trace where the context is created and where the expensive
   work executes. A deliberately UI-owned context needs evidence that its work
   stays short and follows the same storage boundary.
   For networking, trace independent requests from their callers through the
   networking service to URLSession. Look for sequential awaits, explicit queues,
   shared task chains, blocking calls or expensive synchronous actor-isolated
   work that delays another request. Consider session connection limits and
   intentional rate policies. An actor serializes isolated execution between
   suspension points, but it may process another call while a request is
   suspended; an actor alone is not evidence that transfers cannot overlap.
   `@concurrent` is not a prerequisite for overlapping actor-initiated requests.
   For CFA, apply the [networking rule](spec/rules/cfa-net-01.md) and check
   that URLSession calls go through NetworkingManager. Where practical, hold
   the first response open and verify that a second independent request
   reaches the transport before releasing it. Respect documented rate limits.
   Report a source-supported risk separately from a measured delay, and
   distinguish transport initiation from transfer timing on a real connection.
7. **State observation:** Trace how a screen receives current state and updates,
   including identity, snapshots, actor boundaries, subscriptions and cleanup.
   For CFA live data, follow the property read by the View through its ViewModel
   to the observable Feature that owns it. Check whether a confirmed Feature
   change reaches an already open screen without recreating it. Investigate
   stored presentation copies that can go stale, while respecting intentionally
   stable detail snapshots and unsaved drafts. Apply the
   [authoritative observation rule](spec/rules/cfa-obs-01.md).
   Identify consumers that need every event. Trace their delivery, ordering
   and cancellation separately from the screen's current value. Where the
   contract requires it, send two equal-valued events and verify both are
   processed. A correct final value cannot establish that both arrived. If
   the contract defines buffering, hold the consumer back, send a burst, and
   verify which events it receives and in what order when it resumes. Record
   an untested buffering policy separately from the verified UI state.
   For a CFA app-wide listener, apply the
   [app-wide listener rule](spec/rules/cfa-app-02.md). Trace startup and the
   retained task handle for asynchronous listeners. Drive a controlled event
   source after repeated startup signals and verify that one listener forwards
   each event with the relevant screen absent. The responsible Feature
   interprets events and owns the resulting state. Where cancellation or
   replacement is supported, check that the old listener stops forwarding
   and its cleanup cannot stop the replacement. Verify that isolated tests
   shut down their listeners during cleanup. Trace screen-only observation
   separately against the screen's lifetime. For a stream backed by a
   registered observer,
   trace who owns registration, who ends consumption, and how the producer
   removes the observer. Exercise events arriving during teardown and immediate
   resubscription. Check that an old registration cannot publish to the new
   consumer or remove its replacement. If cleanup is scheduled separately,
   establish what can happen before it runs.
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
    CFA conformance, apply the [immutable snapshot rule](spec/rules/cfa-snapshot-01.md).
    Check that published snapshots use `let` properties and that nested values
    and collection elements contain no references that can mutate in place.
    At an isolation boundary, verify that storage returns immutable, Sendable
    domain values. Report a CFA deviation separately from a demonstrated defect.

Keep Swift Concurrency correctness, general architecture and optional CFA-specific
conformance distinct. An app can have a deliberate non-CFA design, and a CFA
layout alone does not prove concurrency correctness or runtime performance.

For existing apps, apply the [design scope rule](spec/rules/cfa-struct-05.md).
Missing optional themes, a CFA footer or starter branding do not affect
concurrency or conformance ratings. If a resource or accessibility issue
affects actual behaviour, describe its evidence separately from styling
preferences. The Health Check is read-only.

When the requested deliverable also includes a CFA conformance verdict, use
the [full conformance checklist](spec/rules/cfa-review-01.md) and
[prohibited patterns](spec/rules/cfa-review-02.md). Record evidence against
each applicable requirement and a reason for each exclusion. Resolve scanner
leads against actual usage and target membership. A whole-app concurrency
assessment can establish a health result while a separate CFA requirement
remains unverified. Keep that requirement open in the conformance assessment
and state what evidence would resolve it.

## Produce the Health Check report

Run the packaged scanner on the current checkout before each Health Check.
Run these commands from the architecture review skill directory, or use the
full path to its bundled script from another directory:

```
node scripts/dashboard/src/whole-app-health.mjs prepare <project-root> <new-inventory-directory>
```

Read `inventory.json`, `checklist.json` and `task-map.json`; record source-backed judgments incrementally in the generated `review-draft.json`. Run `node scripts/dashboard/src/whole-app-health.mjs next <project-root> <review-draft.json>` after each batch to list concrete pending files, entry points and task sites. Continue reviewing related operations and reusing shared-path evidence; do not stop after saving a checkpoint. The command rescans the current project, checks the draft against the source fingerprint and lists unreconciled inventory items. The reviewer supplies the behavioural assessment and evidence. Use the checklist to cover source files, candidate entry points and task sites through meaningful operation batches and justified exclusions. Verify production target membership and add manually discovered operations. Continue until all applicable items are reconciled. SwiftSyntax records source locations,
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
Use the listed build definitions to locate configuration inputs. For isolation
findings, record the selected target and configuration and the effective
Swift settings in the supporting evidence. If configurations differ, qualify
the finding accordingly. A build-definition hash identifies the scanned
input; it does not resolve inherited settings or build overrides.

Reconcile the full production target and file list,
including sources the lexical scan cannot resolve. When `next` returns
`targetReview`, reconcile its build definition paths, excluded test
directories and symbolic links with actual target membership. The scanner
lists symlink paths without following them. For a link used by a
production target, confirm its destination is independently scanned and
cite the canonical file. If a required destination is outside the scanned
inventory, establish a scan scope that covers it before completing the review.
Keep target membership unverified while any required linked source or build
definition is missing. Changing a link target invalidates prior evidence.
Editing the destination invalidates it only when that destination is scanned.

Check the directories listed under `productionTargets.excludedTestDirectories` in the checklist against
actual target membership before confirming that they contain only test sources. If any such directory contains production Swift, run `prepare` again with `--include-tests` as the last argument. The new draft preserves that inventory scope for subsequent commands. Record verified test-only files in a separate file batch with source and membership evidence. Give their candidate entry points and task sites an explicit exclusion reason. Record evidence-backed file batches, detected candidate entry points and each meaningful user or system operation using `scripts/dashboard/Documentation/REVIEWS.md`. A shared helper can be reviewed once and linked from multiple operations after checking each caller. Individual type verdicts are optional. Include
`productionTargets` (an array of reviewed target and local-package names),
`targetInventoryVerified` (true only after verifying membership), and
`entryPoints` entries with each candidate `siteId` and either `operationId` or a
specific `excludedReason`. The matching operation evidence must include the
entry point. Reconcile every entry in `task-map.json` in `taskSites` using the
same `siteId` / `operationId` or `excludedReason` structure; operation evidence
must include the associated task site. If multiple task sites share a source
line, give each corresponding workflow step its exact `taskSiteId` from the
task map as well as a source range. Add a `presentation` object with app, summary, verdict, conclusion and
criteria for the concise report. Each criterion needs title, detail, status
(`pass`, `concern`, `problem`) and an `evidence` array of
`{file, line, endLine}` source ranges. Cite the code that supports the claim,
and carry confirmed problems and source concerns into the visible findings.
Include at least one complete cited range for each such finding and verify
that the visible criterion describes the same issue. Map the
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
trace three distinct cases: the last screen leaves and the Feature retains
the result with no waiter; one of several waiters leaves and the others still
receive the outcome; and an equivalent caller joins the in-flight request
without starting a second one. If a screen requires prompt cancellation,
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
the exact source path to the team, including its ownership and ordering effects. Use
the inspector's scheduled-launch and View-tied-launch findings as leads. Trace
indirect calls and other scheduling mechanisms in source even when the
inspector reports no finding.

For CFA targets, follow the direct AppModel call through Feature startup and
the start of any required app-wide listeners before the callback returns. Check
that repeated startup signals do not create duplicate listeners. Trace events
to the owning Feature when no relevant screen is visible. Record this lifecycle
evidence separately from any startup timing measurement.

Apply the [storage launch rule](spec/rules/cfa-launch-02.md) to CFA targets.
Trace the first Feature request to the storage owner. Check that composition
leaves the store closed and that a file-backed store prepares its configured
parent directory before opening. Hold the open pending and then fail it.
Verify that the root remains visible and an unaffected destination remains
accessible. Inspect root wrappers and blocking overlays as well as the delegate.
Follow directory and open errors to the affected screen, then verify that
retry issues the same domain request at the configured store location and
preserves existing data. Separately, fail a fetch after a successful open.
Verify that an initial fetch surfaces the failure, a failed refresh retains
prior results, and retry reuses the working store. Record controlled tests,
actual store and navigation checks, and first-frame measurements separately.

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
suffix. Distinguish authoritative application state from implementation state
such as in-flight request bookkeeping, service caches and database connections.
For CFA projects, flag competing authorities for the same business state and
check the isolation of internal service state. Identify View, screen
coordination and model boundaries. For each important
business rule, locate its implementation and explain whether it can operate
without constructing UI. Check whether ViewModels arrange existing capabilities
or implement business policies that deserve a model owner. In CFA, apply the
[domain and display rule](spec/rules/cfa-ui-06.md). Trace which filters change
only one screen's presentation and which determine the domain result used by
other consumers. Verify that a screen filter leaves shared Feature data intact.

Inspect SwiftUI View bodies, actions and initializers. Distinguish ordinary
presentation logic and delegated button actions from embedded business rules,
persistence and multi-step operation coordination. For CFA projects, check that
each screen constructs its own private State-backed ViewModel. Construction is
normally inline. Apply the [screen ownership rule](spec/rules/cfa-ui-02.md)
and record the `viewModel` naming convention separately from actual
ownership. A detail View may construct its own ViewModel in its
initializer from a selected immutable snapshot. Flag externally supplied
ViewModels. In other architectures, describe the actual lifetime or ownership
consequences of injection.

For CFA, apply the [dependency flow rule](spec/rules/cfa-flow-01.md) and
[Feature command rule](spec/rules/cfa-api-01.md) at actual call sites. Trace
the screen through its ViewModel to the Feature that owns the business
action. Check whether callers reach through the Feature into a repository
or mutate nested implementation state. Trace any reverse dependency and
identify what ownership boundary it crosses.

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
  and pagination. Locate the owner of the overlap policy. For CFA, apply the
  [overlapping-call rule](spec/rules/cfa-task-01.md) at the Feature boundary.
  Check whether one execution really satisfies equivalent callers. Where each
  command must take effect, submit two identical inputs and verify that both
  execute in admission order across suspension and return their own outcomes.
  Check that failure or cancellation of a predecessor follows the documented
  policy and leaves later calls and task cleanup consistent. Record the product
  reason for policies such as latest-request-wins.
- Button-driven tasks in CFA: trace the action from the View to its ViewModel.
  Apply the [ViewModel task rule](spec/rules/cfa-task-03.md) when the ViewModel
  creates an independently managed task. Check its named handle and keep
  framework-owned lifecycle work and structured children with their existing
  owners. Hold the task pending, repeat an equivalent action and verify the
  callers share execution and observe completion. Check cleanup after success,
  failure and cancellation, and verify a later retry starts new work. If an
  older task can finish after a replacement starts, verify that its result
  and cleanup leave the current state and replacement handle intact. Assess
  distinct commands against their own admission policy and individual outcomes.
- Pull-to-refresh: trace the `.refreshable` closure through the ViewModel
  and check which completion it awaits. For CFA, if the method returns a
  task handle, check that the closure awaits its value. Hold the work pending
  and verify that the indicator remains active while the screen waits.
  Assess cancellation of that wait separately from ownership of a shared
  Feature refresh.
- Time-dependent business decisions: in CFA, apply the
  [injectable clock rule](spec/rules/cfa-time-01.md). Trace when the Feature
  reads its clock and which calendar or time zone governs the decision.
  Advance the controlled clock across the relevant boundary while keeping
  the same Feature instance, then verify that its next decision uses the
  new time. Review a visual countdown separately from business eligibility,
  expiry or retry decisions.
- Lifetime: navigation away, observation ending, sign-out and account changes.
  Work may intentionally outlive a screen; establish its owner and purpose.
- Background work: trace registration, scheduling, system delivery and the
  owning operation separately. For BGTaskScheduler, verify that each identifier
  is permitted and registered once before launch returns. In CFA, follow the
  app-level callback through AppModel to the owning Feature. Verify that
  success, failure and expiration each complete the system callback exactly
  once, including when expiration races with completion. Trace cancellation
  from expiration to the work it owns. Check the system mechanism that permits
  execution after backgrounding and report on-device delivery evidence
  separately from source review.
- Account transitions: in CFA, apply the
  [account lifecycle rule](spec/rules/cfa-account-01.md). Trace sign-out,
  account switching and external session expiry to the Feature that
  coordinates cleanup. Verify that external expiry reaches its owner with
  no account screen open. Check an intact session after failed sign-out,
  cleanup after success, and partial authentication outcomes against the
  actual session. Verify that an ended session stays signed out when cleanup
  fails and that the failure is surfaced. Compare retained data with the
  product's contract, including account caches, unsynchronised work,
  independent purchases and user-owned documents. Hold an old request open
  across the transition, then complete it and verify it cannot publish even
  if cancellation was requested. Include signing back in as the same account
  to exercise session identity. Release delayed writes and cleanup after the
  transition and verify that they cannot recreate cleared data or remove
  data belonging to the newer session. Inspect the persisted records after
  the delayed work finishes, in addition to checking the Feature's visible
  state. For a durable store, reopen it and verify that the same-account
  sign-in retains the new session's writes without restoring cleared records.
- State authority: which object accepts results and controls mutations? Look for
  independent writers or conflicting cached state, not harmless value snapshots.
- Detail navigation in CFA: apply the
  [detail snapshot rule](spec/rules/cfa-ui-03.md). Trace the selected immutable snapshot from the list
  to the destination's own ViewModel. Check two independently identified
  destinations sharing the same Feature. Rebuild one destination with changed
  input but the same SwiftUI identity and verify its existing ViewModel retains
  its selection. Refresh the source and omit one
  selected item. Both destinations should keep their selection and stay open.
  Where the detail offers explicit refresh, check that it updates only its own
  display. Assess intentional live updates against the product requirements.
- Deep links and notification actions in CFA: apply the
  [pending destination rule](spec/rules/cfa-link-01.md) within the app's product
  scope. Trace URL opens and user actions on local or push notifications
  through validation, durable admission and scene navigation. Scheduling and
  delivery alone leave the list unchanged. Verify that repeated callbacks for
  one opening event are deduplicated and separate events for the same
  destination remain distinct. Invalid input and a failed initial save leave
  the list unchanged. Report storage failures and preserve an unreadable
  snapshot until recovery. Check that restoration and a concurrent incoming
  request preserve both the existing entries and the new request across
  restart without resurrecting opened items.
  Apply the [scene navigation rule](spec/rules/cfa-link-02.md) in multi-window
  apps. Either scene can open a pending item without changing another scene's
  navigation. Verify that two simultaneous opens of the same item navigate
  once, an explicit dismissal cannot race its active open, and a different
  item can still open while the first scene is deciding. Refusal, cancellation
  before opening and an unavailable destination leave the item pending.
  Opening the destination counts as success even if its content is still
  loading or cancellation follows. If removal fails after navigation, verify
  that retry saves the removal without navigating again. If dismissal cannot
  be saved, verify the failure is surfaced and the item remains pending for
  retry. Check the durable outcome after restart. For migrations, compare
  existing opening, deferral and history behaviour against the baseline.
- Suspension: apply the [stale-result rule](spec/rules/cfa-conc-02.md) when
  reviewing CFA. For a replaceable operation, suspend the older request, let
  the newer one publish, then complete the older request with success or
  failure. Check that the old request cannot replace current data or surface an
  obsolete error. In a separate case, complete the old request while its
  replacement is still pending and verify the old cleanup leaves the new
  task's handle and loading state intact. Include a cancelled request that
  still returns. Use controlled completion order where feasible.
- Optional download caches: in CFA, apply the
  [optional snapshot rule](spec/rules/cfa-cache-01.md). Verify that a slow
  restore does not delay the remote request and that a missing, incompatible
  or unreadable cache does not prevent it. For independent sources, finish
  one source's refresh before releasing restoration. Verify that restoration
  preserves the fresh result for that source and still restores usable cached
  data for a source that has not refreshed. Hold the optional write pending
  and verify the Feature publishes the fresh data and the caller returns
  before releasing the write. Check that a failed write leaves the refresh
  successful and the previous cache usable. Trace overlapping writes to
  verify an older write cannot replace a newer snapshot. Check that retries
  are bounded, a failed refresh keeps valid in-memory data, and the app only
  claims offline availability for data actually saved.
- Required saves: trace the user edit through the storage result to publication.
  In CFA, apply the [editor draft rule](spec/rules/cfa-obs-02.md). While a
  save is pending, the screen ViewModel holds the draft and the Feature still
  exposes the confirmed value to other consumers. If the write fails, verify
  that the editor retains the input for retry and that other consumers still
  see the confirmed value. Keep an earlier snapshot in a reader, then retry.
  Verify that the Feature publishes a replacement after the write succeeds
  and the earlier snapshot still contains its original values. Cancel an unsaved edit and verify that it discards the
  draft without changing the Feature or storage. For simple UserDefaults
  preferences, check the update before publication and treat it as an
  in-memory update. When confirmed persistence is required, look for a
  storage API that reports the write outcome.
- Record-level persistence: in CFA, apply the
  [durable save rule](spec/rules/cfa-store-01.md). Trace individual creates,
  updates and deletes to writes by stable record identity. If a caller submits
  an entire collection, check whether its snapshot can overwrite unrelated
  changes. Exercise overlapping edits to different records and a delete racing
  an unrelated update. Reopen storage to verify the final records. For an
  explicit whole-dataset import or restore, trace its separate integrity rules
  and verify its failure and recovery behaviour against the product contract.
- Durable storage upgrades: compare the previous store location and format
  with the new open or migration path. Use a disposable store written by the
  previous implementation with representative synthetic records. Verify that
  existing records remain accessible after reopening. When open or upgrade
  fails, verify that the failure reaches the affected operation and the
  original store is preserved without presenting a replacement empty store
  as a successful load. Record this evidence separately from fresh-store tests.
- Preference restoration: apply the [safe fallback rule](spec/rules/cfa-pref-01.md)
  in CFA. Check that a supported value is restored and that a missing or
  obsolete non-critical value in a recognised format uses the product's safe
  default. Verify when the stored value is retained or deliberately replaced.
  Trace unreadable or corrupt durable storage and failed writes as errors.
  Check that fallback never makes missing user records appear successfully
  loaded or saved.
- Offline edits and cross-device sync: apply the
  [sync rule](spec/rules/cfa-sync-01.md) when the product supports these paths.
  For a custom server, trace the edit and pending-sync metadata through one
  local commit. Fail that commit and verify that the app reports neither local
  success nor a pending edit eligible for upload. After a successful local save,
  fail sync, restart and retry with the same edit identity. In a separate case,
  lose the reply after the server applies the edit and verify retry confirms
  the original edit without applying it again. Check that local success and
  server confirmation are reported separately. When reviewing a change to sync,
  verify that an edit persisted by the previous version retains its identity
  and retry metadata after upgrade. For both custom and Apple-managed sync,
  exercise the product's conflict policy with edits to the same item on two
  offline devices. Verify server rejection where applicable. Verify actual
  Apple-managed sync on supported devices with the required capabilities,
  account and schema. Report that evidence separately from source review
  and controlled tests.
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
- Callback bridges: trace registration, callback completion and cancellation
  to the single outcome received by the awaiting caller. Check cancellation
  before registration and while work is pending, including a callback arriving
  after cancellation wins. Verify that the bridge cannot resume twice or leave
  the caller suspended. Where the API supports cancellation, trace whether the
  ownership policy cancels the underlying work or only ends the caller's wait.
- Paid capability entry points: in CFA, apply the
  [paid entry point rule](spec/rules/cfa-pay-01.md). Establish which
  capabilities are paid from product policy and trace each route that presents
  or invokes one, including routes outside the usual screen. PurchasesFeature
  owns entitlement state. The screen ViewModel or alternate caller checks
  current access before use. Verify locked and entitled outcomes for each
  route. If entitlement can change across an await, revoke access while the
  route is suspended and verify that it rechecks before presenting or invoking
  the capability. Record confirmed unguarded paths with source evidence and
  their effect. Keep unresolved paths unverified. Classify a missing
  entitlement guard as a CFA and product-policy finding. If a suspension
  lets revoked access reach the paid operation, describe that timing defect
  and cite the check, suspension and use. Review authorisation on
  server-protected operations separately from client-side presentation.
  Use the [entitlement review workflow](../scripts/dashboard/Documentation/entitlement-review.md)
  for candidate routes, then verify each route against source and product policy.
- Cancellation before side effects: a check before an await does not cover
  cancellation during that await. Trace the interval between preparation or access
  checks and starting a payment, write or other external effect. Check cancellation
  again at the dispatch boundary when the operation is meant to stop. For
  queued work, identify admission and verify the policy on each side of it.
  In CFA, cancelling an unsaved draft discards its input. An admitted durable
  save normally remains Feature-owned and completes even if the screen leaves.
  After a durable commit, verify that confirmed state reflects the write even
  if the caller was cancelled. Check screen-only feedback separately from
  Feature publication.
- Responsiveness: blocking waits and expensive processing on an executor needed
  by other work, including MainActor. Measure before asserting a measured slowdown.

For every suspected defect, construct a concrete event sequence and check the
full path for an existing guard, serialized policy or framework guarantee that
invalidates it. Separate a source-supported possibility from a reproduced failure.
When assessing CFA test coverage, apply the
[behavioural test rule](spec/rules/cfa-test-01.md). Confirm that the named
ViewModel suites and Feature API tests belong to the intended unit-test
target. Trace assertions to observable outcomes and check that dependencies
are isolated from the production shared AppModel. For concurrency-sensitive
checks, verify that tests control the relevant suspension or clock and assert
the caller's outcome as well as shared state. Keep source-inspected test
coverage separate from the results of executed tests.

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
