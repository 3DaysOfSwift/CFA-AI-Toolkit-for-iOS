---
name: cfa-architecture-review
description: Review iOS feature ownership and CFA conformance without changing app code; also produce evidence-grounded Xcode architecture and concurrency dashboards when requested. Includes a whole-app Swift Concurrency Health Check for current or migrated apps, including non-CFA apps.
---

# CFA Architecture Review

Read the [CFA specification reading map](references/spec/README.md) to locate applicable topics. The complete CFA specification remains authoritative; use it for whole-app audits.

Read [project workflow and design authority](references/project-workflow.md) first.
Respect the recorded workflow and current request; new-app design defaults do
not authorize UI changes during maintenance or a narrowly scoped task.

When explaining a substantive finding or answering why a rule exists, use
[decision rationale and verified learning links](references/explanations/guide.md).
Read only the relevant topic note. Explain the consequence in the user's context;
do not impose CFA on another architecture or link to an unpublished article.

For a **Concurrency Migration Health Check**, a **Frankenstein architecture** check,
or a request to assess how an Xcode project actually uses Swift Concurrency, read
[Concurrency Migration Health Check](references/concurrency-migration-health-check.md).
The Health Check reviews the whole application. If the developer explicitly
requests a narrower scope, perform a focused review and deliver scoped findings.
Assess the project's actual architecture regardless of whether it uses CFA.
Keep the Swift Concurrency correctness verdict separate from CFA conformance.
For a whole-app Health Check, run the bundled `whole-app-health.mjs` inventory.
Reconcile source files, entry points and task sites in evidence-backed operation
batches, then generate one app-specific HTML report from the validated review.
Use that workflow's checkpoint and completion check: builds, tests and simulator
launches do not complete the assessment. Finish with the whole-app verdict and report.

In a CFA conformance review, apply the screen-construction invariant to
screen-level SwiftUI Views: a private `viewModel` property with inline `@State` construction by default.
A detail View may construct its own State-backed ViewModel from a selected immutable snapshot
in its initializer. Never inject or share ViewModels. Keep screen and scene
selection in presentation and follow the [detail snapshot lifetime rule](references/spec/rules/cfa-ui-03.md)
when the source data changes. When the detail flow is in scope, trace two
independently identified destinations. Look for evidence that a source
refresh, including omission of a selected item, leaves both destinations
open with their own selections. If the detail offers explicit refresh,
verify that only its display changes. Distinguish source evidence from
observed navigation behaviour. Tests inject Features into ViewModels and
each View continues to construct its own ViewModel.
For existing UIKit screens, trace their actual presentation owners to Features.

Review the requested scope without refactoring the application or changing
project instructions. Missing optional themes, CFA footers or starter branding
are not architecture findings or rating deductions. Report demonstrated
accessibility/functional problems separately from design preferences.

For CFA conformance, read the [CFA specification](references/cfa-specification.md), [CFA change gate](references/cfa-change-gate.md) and inspect actual source and live wiring. Trace screen state, business decisions, authoritative feature state, AppModel construction and the boundaries of any networking, storage and device microservices. Report findings with source locations, consequences and actionable recommendations. Distinguish intentional departures from defects. Do not require a type named AppModel when reviewing another architecture.

For a whole-app CFA conformance audit, apply the complete [review checklist](references/spec/topics/29-review-checklist.md)
to the actual source and live wiring. Record evidence for each applicable
requirement and a reason for each inapplicable one. A whole-app conformance
pass requires evidence for every applicable requirement. Report verified
violations and unresolved requirements separately, and state what evidence
would resolve each open requirement. For a focused review, report the scoped
findings without issuing a whole-app conformance verdict.

For Feature-to-Feature dependencies, apply the
[coordination rule](references/spec/rules/cfa-feature-02.md). Trace the workflow
from its callers through the coordinating Feature to the owners of the state
it reads or changes. Verify the business responsibility and dependency
direction. A stored Feature reference is a lead. Report an architecture
violation only when the traced dependency conflicts with the rule, such as a
cycle or duplicated ownership.

For shared microservices, apply the
[service placement rule](references/spec/rules/cfa-svc-01.md). Trace the
initializer injection and identify the common configuration or shared state
that warrants one instance. A second consumer alone does not make a
domain-specific provider generic. Distinguish service bookkeeping and caches
from the authoritative application state owned by a Feature.

For independent network requests, apply the
[networking rule](references/spec/rules/cfa-net-01.md) and trace each caller
through NetworkingManager to transport initiation. Look for synchronous work
before the first suspension, waits on another request, and deliberate limits.
An actor can accept another call while an earlier download awaits its response.
If a controlled transport check is available, hold one response open and
verify that a second independent request reaches the transport before releasing
it. Establish an unintended delay with source or timing evidence before
reporting a bottleneck. Distinguish app scheduling from URLSession connection
limits and server behaviour.

Trace published snapshots from their authoritative owner to their consumers.
Check stored properties and nested references for mutation, and follow writes
through persistence to publication. A local draft or mutable value alone does
not establish a synchronization defect. For a concurrency finding, identify
the competing copy or mutation path and how it can diverge. For CFA conformance,
check the published snapshot's immutability separately. For editor paths, apply
the [draft rule](references/spec/rules/cfa-ui-04.md). Verify that the screen
ViewModel owns the unsaved input and submits it to the owning Feature. Trace
failed saves to retained input and unchanged confirmed state, and Cancel to
discarding the draft without a write. Check that success publishes only after
required persistence succeeds. Trace storage, network and business failures
through the Feature to the screen ViewModel. Check that the ViewModel owns
screen-specific error text and that it distinguishes failure of the requested
operation from failure of an optional cache write.

When known paid capabilities fall within the review scope, apply the
[paid entry point rule](references/spec/rules/cfa-pay-01.md). Identify the
product’s entitlement policy and verify that PurchasesFeature owns its state.
Trace each identifiable entry point to the check in its ViewModel or alternate
caller, keeping pricing and entitlement decisions outside the capability. Report
an established unguarded call or exposure with source evidence; identify paths
that cannot be resolved as unverified. Do not assume a capability is paid from
its name, or claim a UI check provides server-side authorisation. Look for
behavioural evidence of both locked and entitled outcomes on alternate entry
points as well as the usual screen. Where access can change during a suspension
before use, look for a fresh check after resumption and test evidence that a
revocation prevents the paid presentation or call.
For scanner-assisted leads, use the [entitlement review workflow](scripts/dashboard/Documentation/entitlement-review.md).
The scanner finds candidates, not verified guards or violations; trace them and
inspect alternative entry points before recording a finding.

For a quick CFA project map, run `node scripts/dashboard/src/cfa.mjs inspect <project-folder>` from this skill's directory (add `--json` for machine-readable output). From elsewhere, use the full path to this skill's script. This read-only inspector lists screen → ViewModel → AppModel feature routes and named test files, plus lexical gaps to investigate. For tests, verify the expected suite and
behaviour in source, confirm the target when names collide, and use actual
test results as execution evidence. Check its findings against source before calling anything a defect; it does not type-check, run tests, or establish semantic conformance. Do not use its absence of findings as a review verdict. Check the CFA `viewModel` property name separately from ownership. The inspector can recognise an owned ViewModel under another name.

The screen map relies on conventional filenames and adjacent ViewModels.
Lifecycle closure findings also cover recognizable SwiftUI Views and their
extensions outside those folders. In a flat or unfamiliar project, inspect
unmapped screens, custom modifiers and referenced callbacks directly. Trace
each task to its actual owner and cancellation policy before recording a
finding.

When the inspector flags a direct Feature dependency, trace how the caller
uses it. A genuine business workflow may coordinate Features. Verify that
the workflow has a clear owner, each shared value retains one authoritative
owner, and dependencies are free of cycles. A typed property is a lead.
Check initializer wiring and indirect calls before drawing a conclusion.

For a service-boundary finding, trace the actual caller to the networking or
storage service and confirm production target membership. Apply the
[networking rule](references/spec/rules/cfa-net-01.md) to requests started
directly through URLSession and the [persistence rules](references/spec/topics/19-keep-persistence-behind-repository-contracts.md)
to SwiftData access. A manager declaration identifies a candidate boundary.
Confirm that the relevant requests actually go through it. A URLSession
reference may only configure or inject the session. Follow it to the call
that starts the request before reporting a bypass.
For SwiftData, trace the context and managed records through the storage
owner, including the repository's returned values and nested contents.
Verify that Features receive immutable Sendable domain values. For non-trivial
production work, identify the dedicated `@ModelActor` and trace context
creation and expensive operations. A deliberately UI-owned context still
keeps its records inside the storage boundary and requires evidence that its
work stays short.

For published API and persistence snapshots, apply the
[immutable snapshot rule](references/spec/rules/cfa-snapshot-01.md). Identify
the values the Feature actually publishes, then check their stored properties
and nested collection elements. A `let` reference can still expose mutable
state. Trace durable edits from the draft through the owning Feature and
check that a confirmed write publishes a replacement while a previously
held snapshot remains unchanged.

Apply the [Feature isolation rule](references/spec/rules/cfa-conc-01.md)
even when a Feature has no current screen. Check its effective MainActor
isolation in each affected target, accounting for the Swift language mode,
default isolation and relevant SDK annotations. Trace networking, persistence
and expensive processing into the services that perform the work. CFA services
avoid MainActor by default. When a framework requires MainActor, verify that
the requirement stays within a narrow adapter. An async signature or separate
type alone does not establish where work runs. Separate source findings from
measured responsiveness.

When reviewing shared refreshes in a CFA app, apply the
[shared refresh rule](references/spec/rules/cfa-task-02.md). Trace who owns
the request and what happens when its only screen leaves. Verify that the
Feature can still publish the result with no screen waiting. Separately,
verify that a later equivalent caller joins without starting a duplicate
request, and that cancelling one of several waiters leaves the others able
to receive the result. Where prompt exit is required, check that the
departing screen stops waiting while the request is still suspended.
Identify any product or resource requirement that justifies a different
lifetime.

When reviewing an optional download cache, apply the
[optional snapshot rule](references/spec/rules/cfa-cache-01.md). Trace when
refresh starts, when the caller receives its result and when the replacement
cache becomes durable. Verify that refresh starts while restoration is pending
and can proceed with a missing, incompatible or unreadable cache. Hold the
optional write open and verify the Feature publishes the fresh response and
returns to the caller. Check that a late restore cannot replace fresher data
for the same source and that other sources can restore their usable snapshots.
Verify that a failed refresh keeps valid in-memory data. If the cache write
fails, check that retries are bounded, the previous cache remains readable,
and the caller still receives a successful refresh. Any claim of offline
availability must describe the snapshot that was saved. Check that a delayed
older write cannot replace a newer cache.
Trace required saves for user edits separately and verify that a failed write
leaves the last confirmed value unchanged.

When reviewing Feature state, trace confirmed data, operation state and
failure outcomes separately. Check that starting a refresh preserves usable
data while the operation is pending and that failure can be reported without
discarding it. A result-like state enum that bundles all three conflicts with
the CFA launch and refresh guidance even when it uses a different name.

When offline edits or cross-device sync are in scope, apply the
[sync rule](references/spec/rules/cfa-sync-01.md). Trace local persistence,
pending sync and server confirmation separately. For a custom server, verify
that the edit and its pending-sync metadata are saved together before local
success is reported. Look for evidence that a failed local write reports
neither success nor an edit ready to send. After a successful local write,
verify that a failed sync and restart preserve the edit and its identity,
and that retrying with that identity produces one logical server change.
Look for a test where the server applied the edit but the reply was lost.
After restart, the same edit identity should recover the outcome without
reapplying the change.
When reviewing a replacement sync implementation, use a pending edit saved
by the previous version to verify recovery and retry. Check conflict and
rejection outcomes against the product policy. Check real-device evidence
separately for Apple-managed sync and concurrent offline edits across devices.

When reviewing CFA startup, apply the
[synchronous launch rule](references/spec/rules/cfa-launch-01.md). Follow the
delegate callback through helpers to the AppModel launch signal, then trace
which Feature and listener start calls occur before the callback returns.
Distinguish a deferred launch signal from asynchronous work started by its
owning Feature. Verify repeated callbacks do not duplicate startup. Use
runtime evidence for first-frame timing and when I/O actually starts.
Follow the synchronous path through AppModel construction, conditional
branches and helpers. Check for blocking disk or network I/O before the
callback returns, even when the inspector reports no direct read.
If a screen can refresh data that launch already requested, trace both paths
to the Feature’s overlap policy. Under the default policy, equivalent requests
share one execution and the screen can await its outcome.

Apply the [structural launch rule](references/spec/rules/cfa-launch-03.md)
to each scene. Check that `App.body` installs a stable root and that root
navigation remains available while Features load or fail. For
`conditional-app-body` and `root-startup-gate` findings, follow the condition
and both outcomes. A layout branch can preserve navigation, while a startup
branch that replaces the root with a spinner moves loading presentation out
of the owning screen and its ViewModel.

For a suspected startup storage gate, apply the
[database availability rule](references/spec/rules/cfa-launch-02.md). Trace
from AppModel construction and root presentation to the first store-opening
request. Check whether slow or failed opening can hide the root, block
unaffected navigation, or move the error out of its owning Feature. Use
existing runtime evidence or exercise a safe failure path within the agreed
review scope. A mock fetch can verify Feature recovery, while a real
store-opening and navigation check is needed to establish the launch outcome.
For file-backed storage, trace directory preparation at the configured store
URL and follow failures to the affected screen. Check that retry keeps the
same store and preserves existing files. Trace a fetch failure after a
successful open separately. Verify that retry reuses the working store and
that a failed refresh leaves previously loaded data visible. Record controlled failure evidence
separately from the actual storage and navigation checks.

For an event needed regardless of which screen is visible, apply the
[app-wide listener rule](references/spec/rules/cfa-app-02.md). Trace from
the app lifecycle callback to AppModel's listener startup and retained
task handle, then follow an event to the Feature that interprets it and
owns the resulting state. Check repeated startup and delivery with no
screen mounted. Where the listener supports cancellation or replacement,
trace that path too. For screen-only observation, check the screen or
ViewModel lifetime instead. Record which behaviour is supported by source
and which was exercised by tests.

When reviewing scheduled background work, apply the
[background-work rule](references/spec/rules/cfa-bg-01.md). Check that each
identifier is permitted and registered once during synchronous startup, and
trace request submission separately. Follow the system callback to the
owning Feature. Check that expiration cancels the work and that success,
failure and expiration each complete the system callback exactly once,
including when expiration races normal completion. Distinguish work that
outlives a screen from work allowed to continue after the app backgrounds.
Record actual background execution only when supported by device evidence.

When reviewing deep links or notification actions, apply the
[deep-link rule](references/spec/rules/cfa-link-01.md). Trace URL opens and
user actions on local and push notifications from the app callback to the
receiving scene. For an existing implementation, record how it handles
deferral, retries and notification history so a migration can preserve them.

Where the app uses CFA's pending-request design, trace those callbacks
through DeepLinkingFeature. Verify that scheduling or delivery alone leaves
the pending list unchanged. Trace event identity through retries. Repeated
callbacks for one opening event must not reopen it, and distinct events for
the same destination must remain separate. Check that invalid requests
leave the visible list and saved snapshot intact. A valid request becomes
visible only after saving. Verify that a failed save reaches the caller
without publishing the request. With an unreadable list, verify that the read
error reaches the caller and preserves the original file. After recovery,
check that retry preserves both the saved entries and the incoming request
across restart. Also trace reception during restoration and verify that an
older restore cannot resurrect an opened item or remove unrelated entries.

Verify that refusal, cancellation before opening, and a failed or unavailable
scene leave the request pending. For multi-window apps, apply the
[scene navigation rule](references/spec/rules/cfa-link-02.md). Verify that
either scene can open a pending request without changing another scene's
destination. While one scene is deciding, verify that another can open a
different request. Competing opens of the same request navigate once, and
dismissal must not race an active open of that request. Check that
successful navigation counts even when cancellation follows or content is
still loading. If saving the removal fails after navigation, verify that retry
removes the request without navigating again. For a failed explicit dismissal,
verify that the error is surfaced and the request stays pending until retry
succeeds. For migration reviews, compare the original
and current navigation and notification-history behaviour.

When sign-out, account switching or session expiry is in scope, apply the
[account lifecycle rule](references/spec/rules/cfa-account-01.md). Trace when
the session actually ends, which Feature coordinates cleanup, and what each
affected Feature clears or retains. Reconcile partial authentication failures
with the actual session. If external expiry is supported, verify it reaches
its owner when the account screen is absent. Follow an old session's request across
its suspension points to the final state update. Verify that a late result
cannot repopulate cleared state or enter a new session, even if the old task
was cancelled. If the same account can sign back in while earlier work is
pending, hold an old request open through sign-out and sign-in. Verify that
the final state update checks session identity, since both sessions have the
same account ID. Distinguish failed sign-out with an intact session from
cleanup failure after the session has ended. Trace delayed writes and cleanup
to persistent storage and verify that they cannot affect newer-session records
or recreate cleared data.

When reviewing a widget or another device target, apply the
[multi-device rule](references/spec/rules/cfa-device-01.md). Inspect each
target's source membership and AppModel composition. Check that it reuses
the shared Model, includes only its own Views and ViewModels, and uses APIs
available to that target. Trace the writer, the storage or transfer boundary,
and the receiving Feature's state update. For an App Group widget snapshot,
verify a successful write precedes the timeline reload request and a failed
write issues no request. For a Watch on another device, verify that a separate
copy reaches the receiving data source. When multiple targets can edit the same
data, check their behaviour against the product’s conflict policy. Report the
build and device evidence separately, including what happens when the snapshot
is missing, unreadable, delayed or stale.

For a dashboard or detailed concurrency analysis, read the [dashboard workflow](references/dashboard-workflow.md). The bundled tool is at `scripts/dashboard/src/cli.mjs` relative to this skill; it requires Node.js 20+. It inventories source patterns, not semantic correctness. Only use its concurrency dashboard when the selected scope contains Swift Concurrency. If the app uses only GCD, continue a manual ownership and concurrency review; mark the dashboard unavailable rather than refusing the review or inventing zero scores.

A focused CFA review does not require an app-wide dashboard or numerical ratings. A requested full dashboard requires the complete source-evidence workflow. Do not infer testing evidence from source inspection or claim race freedom from a score.

Deliver findings and verification limits. Save the final Health Check report in `reports/health-check/` at the app repository root, outside the app target’s source directory. Keep working inventory and checkpoints outside app source. App changes, architecture adoption and concurrency migration require their own requested scope; this review does not authorize them.

## Shared Swift coding standards

Read the [Swift coding guide](references/swift-coding-guide.md) before implementing or reviewing Swift. Apply its rules for crash safety, shared model decisions, declarative Views, KISS, errors, concurrency, responsiveness and verification within this workflow's authorized scope. Treat forced operations as explicit crash decisions; never infer permission to retain them merely because they appear safe. Read-only reviews report violations rather than editing code.
