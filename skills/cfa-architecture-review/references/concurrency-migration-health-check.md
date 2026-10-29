# Concurrency Migration Health Check

Use this read-only workflow to explain how an Xcode project actually uses Swift
Concurrency and assess whether its architecture combines conflicting models of
ownership, lifetime or coordination. It also works before or during a migration.
Do not assume a migration occurred unless history or the developer establishes it.

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

Follow representative operations from user or system trigger through business
logic and services to the final state mutation. Include the important distinct
coordination mechanisms, not just the easiest screen. For a whole-project verdict,
maintain coverage of in-scope production features and concurrency boundaries;
unreviewed areas preclude an unqualified negative verdict.

For each relevant operation, inspect:

- Repetition and ordering: overlapping refreshes, changing search queries, writes
  and pagination. Who decides whether to deduplicate, replace, queue or combine?
- Lifetime: navigation away, observation ending, sign-out and account changes.
  Work may intentionally outlive a screen; establish its owner and purpose.
- State authority: which object accepts results and controls mutations? Look for
  independent writers or conflicting cached state, not harmless value snapshots.
- Suspension: what assumptions can change during await? Trace validation and
  commit, actor reentrancy, stale results and cleanup of replaced task handles.
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

Immediately after the overall verdict, show concise assessment rows with a leading
status symbol and written label. The reader must be able to distinguish what works,
what is wrong and what needs investigation without interpreting an ownership map.

- **✅ Working well:** a traced mechanism supports the stated behaviour. Name the
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

Keep the report local and outside application source. Never publish source or
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
