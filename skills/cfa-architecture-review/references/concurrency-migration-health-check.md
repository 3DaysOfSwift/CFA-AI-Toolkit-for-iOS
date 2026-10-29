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

Before ending, check that the response contains the scoped Yes / No / Inconclusive
verdict, operation map, findings (or an explicit statement that none were found),
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

Describe the actual model in a compact table:

| Operation and trigger | State owner | Task/lifetime owner | Isolation | Result and cancellation policy | Evidence |
| --- | --- | --- | --- | --- | --- |

Distinguish task creation from awaited calls in an existing task, source sites
from runtime task counts, actor isolation from threads, and data-race protection
from correctness across suspension points. An async declaration or separate type
does not establish that CPU-intensive work executes away from MainActor. Consult
the project's toolchain and authoritative Swift documentation when semantics are
uncertain; do not impose another compiler version's defaults.

## Trace behaviour before judging it

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
- Failure and cancellation: errors reaching the caller, cleanup, cancellation
  propagation through bridges and continuation completion on all relevant paths.
  Cancellation is cooperative; cancelling a request alone does not prove a stale
  result cannot commit. Check identity/generation or equivalent ordering logic.
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

Keep the report local and outside application source. Never publish source or
migration evidence as part of a health check. Capture reusable case studies only
when separately authorized, using the toolkit's migration evidence workflow.
This health check supplies review guidance, not an automatic semantic detector.
