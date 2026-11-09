---
name: cfa-feature-work
description: Add, change or remove a feature in an existing CFA SwiftUI iOS app. Use for feature work in a CFA project. In another architecture, preserve its existing boundaries unless the developer requests CFA adoption or migration.
---

# CFA feature work

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

Read the [CFA specification](references/cfa-specification.md), [CFA change
gate](references/cfa-change-gate.md), [reference feature](references/reference-feature.md) and [product behaviour
contract](references/product-behaviour-contract.md) before editing.

First identify the live target, AppModel composition, existing feature owner,
affected Views/ViewModels, storage and tests. Record the intended user journey,
success/failure states and existing behaviour that must remain intact.

If the change introduces or touches a paid capability, establish its access
policy from the product requirements. The screen ViewModel reads current
entitlement from PurchasesFeature before presenting or invoking the capability.
Trace other entry points to their own checks and test both locked and entitled
behaviour. Keep pricing decisions separate from the capability's implementation.
Server operations enforce their own access policy.

When changing deep links or notification actions, apply the
[deep-link rules](references/spec/rules/cfa-link-01.md) and preserve the
existing product's history and navigation behaviour. Trace each changed
opening callback to the receiving scene. When the product uses CFA's
pending-request design, include the pending store in that trace. Verify that
declining leaves the request pending and that retrying a failed removal
does not navigate twice. Adding pending storage to an existing product
requires a feature change that calls for it.

When changing sign-out, account switching or session expiry, apply the
[account lifecycle rule](references/spec/rules/cfa-account-01.md). Trace which
Features own account data and coordinate their cleanup through explicit calls.
If sign-out fails before the session ends, preserve that session and its data.
Reconcile partial authentication failures with the actual session. If the
session ended and cleanup fails, keep the app signed out and surface the
cleanup error. After a session change, check the active account or session
generation before publishing in-flight results, even after requesting cancellation. If the same account can sign in
again while earlier work is pending, use session identity and verify that the
old result cannot reach the new session. Verify that delayed writes cannot
recreate cleared records and that delayed cleanup leaves newer records intact.
Check cleanup and retained data
against the product's sign-out contract.

When changing offline editing or cross-device synchronization, apply the
[offline editing and sync rule](references/spec/rules/cfa-sync-01.md). Define
what counts as locally saved and what counts as server-confirmed. For offline
edits sent to a custom server, save the edit and its pending-sync metadata
together before reporting local success. Verify that a failed local write
leaves no edit ready to send. Test recovery after failed sync and restart,
and duplicate-safe retries with the same edit identity. Include a lost reply
after the server applies the edit and verify it is applied only once. Test the
agreed conflict and rejection outcomes. When replacing the sync implementation, include a
pending edit saved by the previous version. For Apple-managed sync, verify
capability, account and schema behaviour on supported devices.

For system background work in scope, apply the
[background-work rule](references/spec/rules/cfa-bg-01.md). Keep registration
and work with the owning Feature. Signal registration once during synchronous
launch and schedule separately. Verify that expiration cancels owned work
and that the system callback completes once, including when expiration and
normal completion race. Verify actual delivery separately on a supported device.

When adding or changing a widget or another device target, apply the
[multi-device rule](references/spec/rules/cfa-device-01.md). Reuse the owning
Feature and shared Model source. Include only the target's own presentation
files and compose the services available to its process. Trace data from the
writer through the handoff to the receiving Feature. Build affected targets
and verify source membership and API availability. Separately verify the
handoff on supported devices, including missing, unreadable, delayed and
stale snapshots. For an App Group widget snapshot, request a timeline reload
only after the write succeeds. WidgetKit controls when the reload occurs.

Fit new UI into the existing product design. Do not add themes, footers or
branding merely because a new Feature is being created. In new-product
development, App Creation guides product shaping without expanding this task.

If the project is already CFA, make the smallest complete vertical change:

1. Add or change the domain behaviour in its owning Feature. Use the
   Feature's microservices for networking, storage or device APIs as needed.
   Keep the Feature on MainActor. Verify that networking, persistence and
   expensive processing use an appropriate isolation boundary off MainActor
   by default. Keep framework-required MainActor work in a narrow adapter.
   Check the actual isolation and compiler settings when moving work into
   an async helper.
   Apply the [immutable snapshot rule](references/spec/rules/cfa-snapshot-01.md)
   when exposing API or persistence data. Use `let` properties with immutable
   contents. Check nested values and collection elements for mutable reference
   state that could change a published snapshot in place. Submit edits through
   the owning Feature and publish a replacement value after the required save.
   Keep unsaved editor values in the screen ViewModel.
   Apply the [durable save rule](references/spec/rules/cfa-store-01.md).
   Persist each record change by stable identity and publish it as saved
   only after required persistence succeeds.
   On failure, keep the draft available for retry and leave confirmed state
   unchanged. For a replaceable download, apply the
   [optional snapshot rule](references/spec/rules/cfa-cache-01.md). Publish
   current server data and return the refresh result while optional caching
   proceeds independently. If changing this path, verify that refresh proceeds
   during a slow restore and with a missing, incompatible or unreadable cache.
   Hold the cache write open and verify both publication and caller completion. For independent
   sources, complete one refresh before restoration and verify that cached
   data from other sources remains usable.
   Verify that a failed refresh keeps valid data visible. If cache replacement
   fails, verify retries stop within the configured limit and the fresh
   result stays visible. Reopen storage to check the last usable snapshot and
   verify that any offline availability refers to saved data. Control write
   order to verify that an older write cannot replace a newer snapshot.
   For changed asynchronous operations, apply the
   [overlapping-call rule](references/spec/rules/cfa-task-01.md). Share one
   execution when it can satisfy equivalent callers. Queue commands that
   must each take effect in admission order across suspension points and
   return each caller's outcome. Use controlled dependencies to verify
   ordering, cancellation and cleanup after failure.
   For shared refreshes, apply the
   [refresh lifetime rule](references/spec/rules/cfa-task-02.md). By default,
   the Feature keeps refreshing when the last screen leaves and retains the
   result for later use. Verify separately that a later equivalent caller
   joins without a second request and that cancelling one of several waiters
   leaves the others able to receive the result. If a departing screen needs
   to return promptly, test that its wait ends while the refresh is suspended.
2. Give every new screen-level SwiftUI View its own adjacent, bespoke ViewModel.
   Reusable presentation components may take snapshots, bindings and action
   closures. Use those closures to forward intent to the owning screen's
   ViewModel. Keep service calls and business decisions in the model.
   Apply the [ViewModel task rule](references/spec/rules/cfa-task-03.md) when
   changing a screen action that starts an unstructured task. Equivalent taps
   return the same active handle, which async callers await. Verify that
   completion clears the handle and a later action can start. Keep separate
   outcomes for commands that must each take effect.
3. Keep AppModel.shared as the production composition root. Construct shared
   services locally in AppModel.live() and inject them into the Features that
   need them. Keep service references with their consumers. Avoid additional
   global singletons and generic manager layers.
4. For a removal request, establish whether it removes a screen, an operation
   or the whole Feature. Trace remaining callers across screens, targets and system entry
   points. Remove only the routes, Views, ViewModels, APIs, tests and Xcode
   memberships that belong exclusively to the removed scope. Keep shared
   capabilities and the tests that cover their remaining callers. Remove stored
   data only when its retention requirements permit it.
5. Give each new ViewModel and concrete Feature its own named test file and
   suite. For existing types, extend their suites to cover changed observable
   behaviour at the owning boundary. A new screen using an existing Feature
   needs its own ViewModel tests and can reuse that Feature’s API tests.
   Build the target and run the affected suites.

If the project is not CFA, do not silently distribute CFA types throughout an
unrelated architecture. An explicitly requested isolated fix stays within
the existing architecture. If the developer requests CFA, use Architecture
Adoption for structural work and Swift Concurrency Migration when the scope
includes replacing legacy concurrency. Keep that decision separate from the
original feature request.

Deliver the changed user journey, ownership map and executed verification. Keep
the change small, readable and reversible; do not refactor unrelated features.

## Shared Swift coding standards

Read the [Swift coding guide](references/swift-coding-guide.md) before
implementing or reviewing Swift. Apply its rules for crash safety, shared model
decisions, declarative Views, KISS, errors, concurrency, responsiveness and
verification within this workflow's authorized scope.
