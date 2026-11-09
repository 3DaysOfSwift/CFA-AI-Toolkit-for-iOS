---
name: cfa-architecture-adoption
description: Adopt CFA in an existing iOS app or bring existing CFA features into alignment. Use for feature ownership and AppModel restructuring; not for GCD migration alone or read-only reviews.
---

# CFA Architecture Adoption

Read the [CFA specification reading map](references/spec/README.md) to locate applicable topics. The complete CFA specification remains authoritative; use it for whole-app audits.

Read [project workflow and design authority](references/project-workflow.md) first.
Respect the recorded workflow and current request; new-app design defaults do
not authorize UI changes during maintenance or a narrowly scoped task.

When explaining a substantive finding or answering why a rule exists, use
[decision rationale and verified learning links](references/explanations/guide.md).
Read only the relevant topic note. Explain the consequence in the user's context;
do not impose CFA on another architecture or link to an unpublished article.

For screen-level SwiftUI Views in scope, apply the specification's
screen-construction invariant: a private `viewModel` property with inline `@State` construction by default.
A detail View may construct its own State-backed ViewModel from a selected immutable snapshot
in its initializer. Never inject or share ViewModels. Keep screen and scene
selection in presentation and follow the [detail snapshot lifetime rule](references/spec/rules/cfa-ui-03.md)
when the source data changes. When changing an existing detail flow, verify
that two independently identified destinations retain their own selections
when the source list changes or omits an item. Preserve any existing explicit
refresh behaviour. For edited values, apply the
[screen editing rule](references/spec/rules/cfa-ui-04.md): the screen
ViewModel owns the unsaved draft, a failed save keeps it available for retry,
and Cancel discards it. The Feature publishes a replacement confirmed value
after required persistence succeeds. Review-only work reports violations;
tests inject Features into ViewModels, not ViewModels into Views.

Restructure an existing app around CFA while preserving its observable behaviour.

A flat `App.swift` or `ContentView` that mixes screen state, persistence, and
business work is not already CFA. Adopt real ownership boundaries before adding
folders; do not relabel a flat app as CFA.

Read [CFA specification](references/cfa-specification.md), [CFA change gate](references/cfa-change-gate.md), [reference feature](references/reference-feature.md) and [product behaviour contract](references/product-behaviour-contract.md).

1. Identify the affected targets, dependency wiring and baseline build/tests. Map current screens, business decisions, state owners and persistence. Record existing failures separately.
2. Define a bounded feature and its behaviour contract. Map each responsibility to its CFA destination before moving code. Inventory screens and tabs with their presentation owners and required concrete AppModel Features. For a SwiftUI screen, identify its dedicated ViewModel. For an existing UIKit screen, trace its actual presentation owner and preserve its UI within the agreed adoption scope. A screen can present several independent business capabilities; several screens can use the same Feature. Identify missing business owners, not missing tab wrappers, and give actual Features named tests. Keep shared business state under one authoritative owner. Preserve public interfaces with temporary adapters where needed.
3. Separate screen presentation from feature rules. Introduce or align AppModel.shared as the composition root with Feature properties, its launch guard, and private task handles for app-wide listeners; its explicit initializer receives Features, and its single `static live()` builds production dependencies. AppModel owns app-wide listeners and forwards events to the relevant Feature. Move each authoritative value and its mutations to a named Feature. Route SwiftData through `SwiftDataManager` and networking through `NetworkingManager`. Call the AppModel launch signal directly and synchronously from the app lifecycle callback, without wrapping the call in a Task; Features may start asynchronous work without making launch wait for disk or network completion. Use SwiftUI's `.task` for screen-owned initial work, without assuming it completes before the screen appears.
4. Migrate one end-to-end feature at a time, checking callers and live wiring. Keep data formats, navigation, errors, ordering and operation lifetimes stable. Remove superseded wiring only once all callers have moved.
5. Preserve the existing design, palettes, theme selector, Settings content and branding. Do not apply new-app design defaults or report their absence as adoption gaps. An explicitly requested visual change stays limited to that request; record it in the behaviour contract and verify saved preferences and affected interactions.
6. Build and run relevant regression checks at each meaningful boundary.
   Apply the [review checklist](references/spec/topics/29-review-checklist.md)
   to the agreed scope. Check final ownership, task behaviour and live wiring
   against the actual source and tests. Explain remaining transitional
   components and identify unverified requirements. A whole-app CFA verdict
   requires evidence for every applicable checklist item across the app.

When moving networking behind the [networking rule](references/spec/rules/cfa-net-01.md),
preserve intentional request limits and ordering. Verify that an independent
request reaches the transport while another response is held open. If the
manager is an actor, check for a real wait between requests before changing
its isolation. Keep any shared mutable request policy isolated.

For system background work in scope, apply the
[background-work rule](references/spec/rules/cfa-bg-01.md). Keep registration
and work with the owning Feature. Verify each permitted identifier registers
once during synchronous launch and scheduling happens separately. Check that
success, failure and expiration each complete the system callback exactly once,
including when expiration races normal completion. Verify that expiration
cancels the owned work. Verify actual delivery separately on a supported device.

When moving shared Model code used by an existing widget or another device
target, apply the [multi-device rule](references/spec/rules/cfa-device-01.md).
Record the existing target membership and data handoff before moving files.
Preserve the handoff and its user-visible behaviour, including when a snapshot
is missing, unreadable, delayed or stale. Verify affected targets still build
and check membership and API availability. Exercise transfer and receiving
Feature updates on supported devices separately from those checks. For an App
Group widget snapshot, verify the write precedes the reload request and a
failed write issues no request.

When moving app-wide observation to AppModel, apply the
[app-wide listener rule](references/spec/rules/cfa-app-02.md). Verify that
repeated startup leaves one listener forwarding events to the responsible
Feature with no relevant screen mounted. If the listener can be replaced,
verify that the old listener stops forwarding and its cleanup leaves the
replacement running.

When moving ownership of published API or persistence values, apply the
[immutable snapshot rule](references/spec/rules/cfa-snapshot-01.md). Check
nested values for mutable references and keep editable drafts separate.
Verify that successful durable writes publish replacements without changing
snapshots already held by callers.

When changing store access, apply the
[database availability rule](references/spec/rules/cfa-launch-02.md) and its
verification checklist. Keep root navigation available during slow or failed
opening. Verify Feature-scoped retry and reuse of the working store after a
fetch failure.

When moving a replaceable download cache into a new ownership boundary, apply
the [optional snapshot rule](references/spec/rules/cfa-cache-01.md). Trace
refresh, restoration and cache writes separately. Verify that fresh data is
published and refresh callers are released while the optional write is pending.
A late restore must leave newer data for the same source intact. Exercise a
failed cache write and a failed durable edit save separately.

When moving durable storage ownership, preserve the existing store location,
schema compatibility and saved records. Verify against a disposable store written
by the previous version with representative synthetic records, including
reopening after the change. An isolated empty store
can verify fresh setup. Use the existing-store check to catch upgrade failures,
and preserve the original data if opening or migration fails.

When moving ownership of data that already syncs, apply the
[sync rule](references/spec/rules/cfa-sync-01.md). Record the current storage
format, pending edit identities and metadata, and the product's conflict and
rejection policy. Verify that edits already pending before adoption survive
a failed sync and restart after the change. Confirm that retry still produces
one logical server change, including when the server applied the edit before
losing its reply. Verify that local save and server confirmation remain
distinct. Verify affected Apple-managed sync on supported devices.

Use this workflow for an architecture-only adoption when the application is
already modern or the developer has explicitly limited the scope to structure.
For a legacy GCD, OperationQueue or callback-based application, use **Legacy
GCD migration**: it establishes CFA ownership and migrates concurrency in
separate, verified feature checkpoints. Do not silently perform a whole-app
concurrency rewrite during a narrowly requested architecture-only adoption.

Deliver a before/after ownership map, behaviour evidence and any remaining migration ledger. Existing CFA feature enhancements may use the same rules at feature scope without restructuring the whole app.

## Preserve app branding

Do not add a CFA starter icon during ordinary maintenance. Preserve existing
artwork, variants and target identity. Repair icon wiring when it belongs to the
requested fix; use bundled starter artwork only on an explicit request.
Do not repeatedly offer branding changes or count their absence as CFA defects.

## Shared Swift coding standards

Read the [Swift coding guide](references/swift-coding-guide.md) before implementing or reviewing Swift. Apply its rules for crash safety, shared model decisions, declarative Views, KISS, errors, concurrency, responsiveness and verification within this workflow's authorized scope. Treat forced operations as explicit crash decisions; never infer permission to retain them merely because they appear safe. Read-only reviews report violations rather than editing code.
