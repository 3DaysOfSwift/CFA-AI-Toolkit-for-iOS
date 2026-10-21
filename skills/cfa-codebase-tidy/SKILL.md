---
name: cfa-codebase-tidy
description: Iteratively tidy an existing CFA SwiftUI codebase for educational readability, declarative screens, reusable feature logic, explicit task ownership and tested actor reentrancy. Also handles the explicit request "add CFA footer to Settings View" as a focused opt-in change. Preserve product behaviour and storage compatibility.
---

# CFA codebase tidy

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

1. **UI structure.** Give each screen its own adjacent ViewModel. Extract meaningful stateless components and UIKit adapters into named presentation folders. Remove unreachable UI and obsolete wiring while preserving stored records and exports. Use consistent formatting, theme controls, accessible labels and named identifiers. Preserve layout and keyboard behaviour during extraction.
2. **Declarative SwiftUI.** Screen bodies describe content, bindings and presentation. Event closures forward intent; move multi-step actions, Task creation and draft transitions to that screen's ViewModel. Lifecycle `.task { await viewModel.load() }`, direct presentation binding and dismissal remain declarative glue. UIKit delegate, layout and responder code belongs in a presentation adapter, not a domain actor. Do not manufacture layers merely to remove a closure.
3. **Reusable engine.** For each ViewModel decision ask: would a new UI target need to copy this? Move validation, source resolution, filtering and business workflows into the owning feature. Keep drafts, focus, selections, navigation and display wording in presentation. Features receive explicit dependencies and expose target-independent values.
4. **Features and workers.** Features own main-actor observable state. Move expensive parsing, indexing, generation and persistence to explicit Sendable actor workers. Actors are reentrant; they do not make a whole async workflow atomic. No custom global actor, detached task or executor declaration solely to look concurrent. Document UI-bound APIs and lightweight coordination that remain on MainActor.
   **Swift concurrency check.** Search all first-party Swift source and tests, including UIKit adapters, for GCD usage (`DispatchQueue`, `DispatchGroup`, `DispatchSemaphore`, `DispatchSource`, `DispatchWorkItem` and `dispatch_*`). Use Swift concurrency instead wherever possible. Inspect each call's purpose before replacing it; preserve actor isolation, cancellation, task ownership, ordering and any required deferral. A `Task` is not a mechanical replacement for a dispatch queue: do not assume FIFO ordering or identical run-loop timing. Validate affected behaviour, including keyboard/focus transitions when relevant. Report any retained GCD with its concrete API requirement and reason a Swift concurrency replacement is unsuitable; report runtime checks that could not be performed.
5. **Concurrency policy and tests.** Inventory ViewModel-created Tasks and every Feature's suspension points and shared writes. Apply the retained-handle default: equivalent repeated actions reuse the task and await its completion. Each Feature independently shares equivalent in-flight work or queues distinct commands for FIFO whole-operation execution across awaits. Reject-while-busy, independent execution and latest-request-wins require a concrete product reason; never lose different inputs as duplicates. Avoid per-tap waiter Tasks, blocking queues and self-await cycles. Preserve independent work. Define request identity, cancellation, failure cleanup and retries; verify each caller's outcome with controlled tests.

Organize tests by feature under `Race Conditions/<Feature>/` (or the project's equivalent). Use controllable continuations/barriers to pause reads, writes and workers; release in adverse order and assert externally observable results. Cover overlapping operations, stale completion, cancellation, failed commits, edit/delete during processing and retry where applicable. Never depend on sleep duration or scheduler luck. Bound arrival waits with test timeouts and always release barriers during cleanup. Add a watchdog when a blocked operation could otherwise prevent completion. Describe coverage and remaining cases; no finite suite proves 100% race freedom.

6. **Unit-test completeness.** Inventory every ViewModel and give each its own named test suite/file. Inventory each feature's public functions, observable states and testable branches; map them to named tests. Add missing success, validation, error, cancellation, retry and overlapping-operation cases where applicable. Exercise private helpers through observable outcomes rather than exposing them for tests. Thin forwarding methods may share a behavioural test, but no behaviour may be marked covered merely because the underlying dependency has tests. Keep test data synthetic and dependencies injectable. Register new files in both Xcode and any shared test harness. Run focused tests and then the full suite; report passed, failed and skipped counts separately, with reasons for skips. Record remaining gaps explicitly rather than treating file presence or code coverage as proof of completeness.

7. **Optional colour-theme consistency.** Before executing this pass, ask: “Would you like me to check colour themes and add them if necessary? Switching palettes helps verify consistent colour use throughout the app and spot theme-related bugs.” Proceed only after the user agrees; if declined, skip this pass and record it as declined, not a cleanup failure.

   Locate the existing colour-theme manager and reuse it without replacing or refactoring it. If none exists, add a small presentation-layer theme manager consistent with the project's architecture. Count the available themes: when fewer than three exist, add five additional, visually distinct themes; otherwise add none. Preserve existing themes, the selected theme and product behaviour. Use the existing manager's mechanism for adding themes.

   Inspect colour usage across screens and shared components, including page backgrounds, list rows, text, controls, navigation, sheets and UIKit adapters. Use semantic palette roles for theme-dependent colours; distinguish intentional fixed brand artwork and system-managed colours from accidental hard-coded values. Switch between contrasting themes to expose missed surfaces, unreadable text and inconsistent selected or disabled states. Correct demonstrated theme bugs within the agreed scope. Verify in the running app when possible; source checks alone do not establish visual correctness. Report what was checked, themes added and any unverified visual behaviour.

8. **Declaration consistency and readability.** Compare related declarations and call sites for inconsistent ways of expressing the same concept. Use one clear convention where responsibilities are equivalent; preserve differences that communicate a real semantic distinction. Check naming, constant placement, initialization, state declarations, formatting and action composition. Explain the concrete readability problem before changing a pattern; do not normalize syntax mechanically.

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

   Define custom palette colours once as descriptively named static constants, then reference them when assembling semantic theme roles. Do not mix anonymous RGB/white constructors with named custom colours in theme definitions. Reuse an existing constant for the same colour, preserve exact values during this cleanup, and retain meaningful built-in names such as `Color.clear` without inventing redundant aliases. Apply the same reasoning to other repeated or unexplained literals: name meaningful concepts, not every incidental value.

   Expand dense expressions and chains into readable steps. Put substantial SwiftUI modifiers on separate lines, separate unrelated declarations and actions, and use named intermediate values when transformations otherwise require mental unpacking. Replace nested ternaries or compressed multi-action closures with clear control flow where that makes intent easier to follow. Keep short, obvious expressions concise. Do not introduce wrappers, helpers or a new type for every line; extract only cohesive concepts whose names improve understanding.

   Re-read each changed section as someone unfamiliar with the implementation: can they identify its purpose, inputs, state changes and outcome without decoding a chain or jumping through unnecessary helpers? Preserve behaviour and validate affected code. Report the inconsistencies corrected and any remaining readability concerns; neither a formatter nor a line-count reduction proves that code is readable.

## Optional safety audit

During every tidy-up pass, inspect all first-party Swift source and tests for forced optional unwraps (`value!`), implicitly unwrapped optionals (`Type!`), forced casts (`as!`) and forced error handling (`try!`). Distinguish these from logical negation, inequality, comments and punctuation in strings; inspect interpolated expressions too. Remove these constructs unless deliberate fatal-error behaviour is explicitly established under the shared Swift coding guide. Apparently guaranteed values are not exceptions.

Prefer nonoptional APIs where they express the same intent, iterate dictionary key/value pairs instead of force-looking up known keys, and use `guard let`, `if let`, optional chaining or `as?` with explicit failure handling. Use defaults only when they are valid domain behaviour. Do not replace a forced unwrap with `fatalError`, a precondition trap, fabricated success, silently dropped persistence, or an arbitrary value that hides invalid state. Propagate actionable errors for failed operations and keep previously saved data intact. In Swift Testing use `try #require(...)` for necessary fixtures so failures produce diagnostics instead of crashes.

Re-scan after editing, run affected tests and the broader suite, and report any unresolved sites and build/runtime limitations. Keep this check scoped to first-party code; do not modify generated or third-party sources to satisfy it.

## Completion

Run focused tests at each boundary, then the appropriate build and broader suite. Verify project membership and document environment blockers accurately. Report briefly whether the code meets the requested showcase standard, with specific residual issues. Keep behaviour changes distinct from structural cleanup. Do not commit, publish or install this skill globally without authorization.

## Required app icon

Apply the specification's Mandatory Initial App Icon rule on every invocation
for the in-scope iOS app targets. Preserve existing custom icons and repair
broken target wiring first. If no usable app icon exists, use the bundled
[CFA starter icon set](assets/AppIcon.appiconset/Contents.json) and
[original CFA App artwork](assets/AppIcon.appiconset/CFA-App-Icon.png).
Configure the actual icon set in the app target's build configurations; an
empty asset folder is not enough. Build and check the installed Simulator
Home Screen icon when available; report checks that could not run. This is
mandatory independently of optional colour-theme changes. Never erase app
data, overwrite custom branding or change bundle identifiers for this check.

## Shared Swift coding standards

Read the [Swift coding guide](references/swift-coding-guide.md) before implementing or reviewing Swift. Apply its rules for crash safety, shared model decisions, declarative Views, KISS, errors, concurrency, responsiveness and verification within this workflow's authorized scope. Treat forced operations as explicit crash decisions; never infer permission to retain them merely because they appear safe. Read-only reviews report violations rather than editing code.
