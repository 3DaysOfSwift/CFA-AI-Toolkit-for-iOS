---
name: cfa-codebase-tidy
description: Iteratively tidy an existing CFA SwiftUI codebase for educational readability, declarative screens, reusable feature logic, explicit task ownership and tested actor reentrancy. Also handles the explicit request "add CFA footer to Settings View" as a focused opt-in change. Preserve product behaviour and storage compatibility.
---

# CFA codebase tidy

Read the [CFA specification reading map](references/spec/README.md) to locate applicable topics. The complete CFA specification remains authoritative; use it for whole-app audits.

Read [project workflow and design authority](references/project-workflow.md) first.
Respect the recorded workflow and current request; new-app design defaults do
not authorize UI changes during maintenance or a narrowly scoped task.

When explaining a substantive finding or answering why a rule exists, use
[decision rationale and verified learning links](references/explanations/guide.md).
Read only the relevant topic note. Explain the consequence in the user's context;
do not impose CFA on another architecture or link to an unpublished article.

Apply the specification's screen-construction invariant within the requested
scope: a private `viewModel` property with inline `@State` construction by default.
A detail View may construct its own State-backed ViewModel from a selected immutable snapshot
in its initializer. Never inject or share ViewModels. Keep screen and scene
selection in presentation and follow the [detail snapshot lifetime rule](references/spec/rules/cfa-ui-03.md)
when the source data changes. Review-only work
reports violations; tests inject Features into ViewModels, not ViewModels into Views.

Read the project's AGENTS.md, the bundled [CFA specification](references/cfa-specification.md) and [CFA change gate](references/cfa-change-gate.md). Preserve the [product behaviour contract](references/product-behaviour-contract.md). This workflow refines an existing CFA architecture; do not invent a new application framework. Use architecture adoption for adopting CFA and read-only architecture review when changes are not requested.

## Explicit Settings footer request

“Add CFA footer to Settings View” invokes only the specification's Settings
About Section and CFA Footer change, not a whole-app cleanup. Apply the same
layout when the user explicitly agrees to add it during a broader tidy-up.
Preserve and merge existing branding, About content and legal/privacy details.
Verify capabilities before describing storage or on-device AI. Read the version
and build from the bundle and place them outside the cells. Never add this
footer automatically to existing apps, repeatedly offer it, or flag its absence
as a tidy-up failure. An ordinary tidy-up is not consent to add branding.

## Iteration contract

Record a baseline and a short ledger: observed problem, owner, change, evidence, remaining limitation. Inspect actual callers and Xcode target membership. Work through the passes below, re-reviewing changed code after each pass. Repeat while concrete issues remain, not to meet an arbitrary count. Finish when the agreed scope has no known actionable violations; report unverified runtime behaviour separately. Never call a project a showcase on the basis of folder names or passing tests alone.

**KISS and readability govern every pass.** Optimize for a new reader understanding the code, including developers learning Swift. Fewer lines, clever syntax and longer chains are not evidence of simplicity. Prefer explicit names and a straightforward flow; avoid adding abstractions merely to satisfy a style preference.

1. **UI structure.** Give each screen-level SwiftUI View its own adjacent ViewModel. Trace existing UIKit screens through their actual presentation owners. Extract meaningful stateless components and UIKit adapters into named presentation folders. Remove unreachable UI and obsolete wiring while preserving stored records and exports. Use consistent code formatting and named identifiers. Preserve the existing design system and accessible labels. Preserve layout and keyboard behaviour during extraction.
2. **Declarative SwiftUI.** Screen bodies describe content, bindings and presentation. Event closures forward intent; move multi-step actions, Task creation and draft transitions to that screen's ViewModel. A lifecycle `.task` awaiting a ViewModel's async method, direct presentation binding and dismissal remain declarative glue. If the method returns a Task handle, await its `value` for completion. Check cancellation separately: awaiting the handle does not forward the lifecycle task’s cancellation to it. Keep screen-only cancellation with the presentation owner and let shared Feature work follow its own policy. UIKit delegate, layout and responder code belongs in a presentation adapter, not a domain actor. Do not manufacture layers merely to remove a closure.
3. **Reusable engine.** For each ViewModel decision ask: would a new UI target need to copy this? Move business validation, source resolution, domain filtering and business workflows into the owning Feature. Keep unsaved field values in the screen ViewModel and preserve them if a save fails. Keep focus, navigation, display wording and filters that only change what one screen shows in presentation. A screen filter works from a snapshot and leaves the shared Feature data intact. Features receive explicit dependencies and expose target-independent values. Apply the [Feature coordination rule](references/spec/rules/cfa-feature-02.md) before extracting a workflow that touches several Features. Keep screen-only composition in the ViewModel. When a workflow has its own business responsibility, give it an explicit model-level owner and preserve each participating Feature's authoritative state. Check that dependencies remain directional and free of cycles.
4. **Features and workers.** Features own main-actor observable state. Move expensive parsing, indexing, generation and persistence off the MainActor using an appropriate isolation and execution strategy for the toolchain. Use actors when they protect shared mutable state; stateless workers do not need an actor merely to run asynchronously. Actors are reentrant; they do not make a whole async workflow atomic. No custom global actor, detached task or executor declaration solely to look concurrent. Document UI-bound APIs and lightweight coordination that remain on MainActor.
   **Swift concurrency check.** Search all first-party Swift source and tests, including UIKit adapters, for GCD usage (`DispatchQueue`, `DispatchGroup`, `DispatchSemaphore`, `DispatchSource`, `DispatchWorkItem` and `dispatch_*`). Use Swift concurrency instead wherever possible. Inspect each call's purpose before replacing it; preserve actor isolation, cancellation, task ownership, ordering and any required deferral. A `Task` is not a mechanical replacement for a dispatch queue: do not assume FIFO ordering or identical run-loop timing. Validate affected behaviour, including keyboard/focus transitions when relevant. Report any retained GCD with its concrete API requirement and reason a Swift concurrency replacement is unsuitable; report runtime checks that could not be performed.
5. **Concurrency policy and tests.** Inventory ViewModel-created Tasks and every Feature's suspension points and shared writes. Apply the retained-handle default: equivalent repeated actions reuse the task and await its completion. Each Feature independently shares equivalent in-flight work or queues commands that must each run for FIFO whole-operation execution across awaits. Determine equivalence from product behaviour; matching inputs alone do not make required commands duplicates. Reject-while-busy, independent execution and latest-request-wins require a concrete product reason. Avoid per-tap waiter Tasks, blocking queues and self-await cycles. Preserve independent work. Define request identity, cancellation, failure cleanup and retries; verify each caller's outcome with controlled tests.

When tidying shared refreshes, apply the
[shared refresh rule](references/spec/rules/cfa-task-02.md). Unless the product
has a different policy, verify that the Feature keeps the result even if its
only screen waiter leaves. Verify separately that a later equivalent caller
joins without a duplicate request and that cancelling one of several waiters
leaves the others able to receive the result. Where a screen must exit
promptly, verify its wait ends before the suspended refresh completes.

When tidying a cache for replaceable downloads, apply the
[optional snapshot rule](references/spec/rules/cfa-cache-01.md), including its
verification checklist. Confirm that refresh proceeds while restoration is
pending and when the cache is missing, incompatible or unreadable. Hold the
optional write pending and verify that fresh data is published and the caller
completes. Force a replacement failure and reopen storage to verify that the
previous usable snapshot survives. Verify that late restores and writes
cannot replace fresher data for the same source, while other sources can still
restore their own snapshots.

When changing store access, apply the
[database availability rule](references/spec/rules/cfa-launch-02.md) and its
verification checklist. Keep root navigation available during slow or failed
opening. Verify Feature-scoped retry and reuse of the working store after a
fetch failure.

When moving durable storage ownership, preserve the existing store location,
schema compatibility and saved records. Verify against a disposable store written
by the previous version with representative synthetic records, including
reopening after the change. An isolated empty store
can verify fresh setup. Use the existing-store check to catch upgrade failures,
and preserve the original data if opening or migration fails.

When tidying existing offline edits or sync, follow the
[sync rule](references/spec/rules/cfa-sync-01.md). Preserve pending edit
identities, their persisted metadata and the existing conflict and rejection
policy. Verify that moving storage or task ownership leaves pending edits
recoverable after failure and restart and safe to retry. If the server can
apply an edit before losing its reply, verify that retry with the saved identity
does not apply it again. Keep locally saved
and server-confirmed outcomes distinct.

Keep cancellation and ordering tests in the named ViewModel or Feature suite when they exercise that owner. Use a dedicated concurrency test group for cross-boundary scenarios that need one. Use controllable continuations/barriers to pause reads, writes and workers; release in adverse order and assert externally observable results. Cover overlapping operations, stale completion, cancellation, failed commits, edit/delete during processing and retry where applicable. Never depend on sleep duration or scheduler luck. Bound arrival waits with test timeouts and always release barriers during cleanup. Add a watchdog when a blocked operation could otherwise prevent completion. Describe coverage and remaining cases; no finite suite proves 100% race freedom.

6. **Unit-test completeness.** Inventory every ViewModel and give each its own named test suite/file. Inventory each feature's public functions, observable states and testable branches; map them to named tests. Add missing success, validation, error, cancellation, retry and overlapping-operation cases where applicable. Exercise private helpers through observable outcomes rather than exposing them for tests. Thin forwarding methods may share a behavioural test, but no behaviour may be marked covered merely because the underlying dependency has tests. Keep test data synthetic and dependencies injectable. Register new files in both Xcode and any shared test harness. Run focused tests and then the full suite; report passed, failed and skipped counts separately, with reasons for skips. Record remaining gaps explicitly rather than treating file presence or code coverage as proof of completeness.

7. **Explicitly requested theme work only.** Skip this pass unless the current request asks for theme changes or diagnosis. Do not offer to add themes during ordinary tidy-up, count palettes against a quota, or require a new ThemeManager. Reuse the product's existing theme system and approved design.

   Within the requested scope, inspect semantic colours, contrast, selection persistence, system appearance, sheets and selected/disabled states. Distinguish deliberate fixed artwork from demonstrated bugs. Preserve existing palettes, selector style and saved selections unless changing them is explicitly requested. Verify affected appearances in the running app when possible and report unavailable checks. A request to correct one colour does not authorize a new theme system.

8. **Declaration consistency and readability.** Compare related declarations and call sites for inconsistent ways of expressing the same concept. Use one clear convention where responsibilities are equivalent; preserve differences that communicate a real semantic distinction. Check naming, constant placement, initialization, state declarations, formatting and action composition. Explain the concrete readability problem before changing a pattern; do not normalize syntax mechanically.

   After replacing a route, trace callers of the superseded methods and stored
   state. Check affected targets, tests and system callbacks before deleting
   them. For example, after moving startup to a synchronous Feature signal,
   verify that an older async loading method has no remaining callers before
   removing it and its exclusively owned helpers. Preserve any capability still
   used by another route.

   **Required variable-name scan.** On every tidy-up invocation, apply the
   [Swift coding guide's variable-name scan](references/swift-coding-guide.md#variable-name-scan-during-every-tidy-up)
   throughout the agreed first-party source and test scope, including properties,
   locals, parameters and their callers. Do not limit it to recently changed
   lines or colour themes. Check domain meaning, framework vocabulary, equivalent
   names across layers, counts/collections, units, Boolean predicates and
   draft/pending/saved distinctions. Record concrete rename candidates and why
   they help; preserve clear short names and required API names. Apply safe
   renames consistently and validate them. Flag persistence or external-contract
   changes separately; this pass does not authorize migrations or wider product
   changes. Report representative renames, justified exceptions, scope and
   verification limits even when the scan finds nothing to change. This naming
   scan is required independently of the optional colour-theme pass.

   Define custom palette colours once as descriptively named static constants, then reference them when assembling semantic theme roles. Do not mix anonymous RGB/white constructors with named custom colours in theme definitions. Reuse an existing constant for the same colour, preserve exact values during this cleanup, and retain meaningful built-in names such as `Color.clear` without inventing redundant aliases. For other repeated or unexplained literals, apply the [shared constants rule](references/spec/rules/cfa-const-01.md). Confirm that callers share the same concept before merging equal values. Keep Feature-specific constants with their owner and use a purpose-named enum for values that genuinely belong to the whole app. Preserve bundle metadata and localization as the authorities for app identity and translatable text, respectively.

   Expand dense expressions and chains into readable steps. Put substantial SwiftUI modifiers on separate lines, separate unrelated declarations and actions, and use named intermediate values when transformations otherwise require mental unpacking. Replace nested ternaries or compressed multi-action closures with clear control flow where that makes intent easier to follow. Keep short, obvious expressions concise. Do not introduce wrappers, helpers or a new type for every line; extract only cohesive concepts whose names improve understanding.

   Re-read each changed section as someone unfamiliar with the implementation: can they identify its purpose, inputs, state changes and outcome without decoding a chain or jumping through unnecessary helpers? Preserve behaviour and validate affected code. Report the inconsistencies corrected and any remaining readability concerns; neither a formatter nor a line-count reduction proves that code is readable.

## Optional safety audit

During every tidy-up pass, inspect all first-party Swift source and tests for forced optional unwraps (`value!`), implicitly unwrapped optionals (`Type!`), forced casts (`as!`) and forced error handling (`try!`). Distinguish these from logical negation, inequality, comments and punctuation in strings; inspect interpolated expressions too. Remove these constructs unless deliberate fatal-error behaviour is explicitly established under the shared Swift coding guide. Apparently guaranteed values are not exceptions.

Prefer nonoptional APIs where they express the same intent, iterate dictionary key/value pairs instead of force-looking up known keys, and use `guard let`, `if let`, optional chaining or `as?` with explicit failure handling. Use defaults only when they are valid domain behaviour. Do not replace a forced unwrap with `fatalError`, a precondition trap, fabricated success, silently dropped persistence, or an arbitrary value that hides invalid state. Propagate actionable errors for failed operations and keep previously saved data intact. In Swift Testing use `try #require(...)` for necessary fixtures so failures produce diagnostics instead of crashes.

Re-scan after editing, run affected tests and the broader suite, and report any unresolved sites and build/runtime limitations. Keep this check scoped to first-party code; do not modify generated or third-party sources to satisfy it.

## Completion

Run focused tests at each boundary, then the appropriate build and broader suite. Verify project membership and document environment blockers accurately. Report which requirements the changed scope satisfies and any findings that remain. Reserve a whole-app CFA verdict for a complete review checklist backed by evidence from the app. Keep behaviour changes distinct from structural cleanup. Do not commit, publish or install this skill globally without authorization.

## Preserve app branding

Do not add a CFA starter icon during ordinary maintenance. Preserve existing
artwork, variants and target identity. Repair icon wiring when it belongs to the
requested fix; use bundled starter artwork only on an explicit request.
Do not repeatedly offer branding changes or count their absence as CFA defects.

## Shared Swift coding standards

Read the [Swift coding guide](references/swift-coding-guide.md) before implementing or reviewing Swift. Apply its rules for crash safety, shared model decisions, declarative Views, KISS, errors, concurrency, responsiveness and verification within this workflow's authorized scope. Treat forced operations as explicit crash decisions; never infer permission to retain them merely because they appear safe. Read-only reviews report violations rather than editing code.
