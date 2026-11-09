---
name: swift-concurrency-migration
description: "Legacy GCD migration: migrate GCD, OperationQueue and callback-based iOS apps to Cooperative Feature Architecture and Swift Concurrency while preserving product behaviour. Use when a developer requests migration of a legacy iOS codebase to CFA and Swift Concurrency; not for general modernisation or a small isolated API conversion."
---

# Legacy GCD migration

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
when the source data changes. When changing an existing detail flow, verify
that two independently identified destinations retain their own selections
when the source list changes or omits an item. Preserve any existing explicit
refresh behaviour. For edited values, apply the
[screen editing rule](references/spec/rules/cfa-ui-04.md): the screen
ViewModel owns the unsaved draft, a failed save keeps it available for retry,
and Cancel discards it. The Feature publishes a replacement confirmed value
after required persistence succeeds. Review-only work reports violations;
tests inject Features into ViewModels, not ViewModels into Views.

Migrate a legacy application into CFA and Swift Concurrency by preserving its
product behaviour, not translating concurrency syntax.

Read [CFA specification](references/cfa-specification.md), [CFA change gate](references/cfa-change-gate.md), [reference feature](references/reference-feature.md), [migration workflow](references/concurrency-migration.md) and [product behaviour contract](references/product-behaviour-contract.md).

This is a CFA migration. It changes the architecture as well as legacy GCD,
OperationQueue and callback implementation details. Preserve user-visible
behaviour, stored data, error delivery, ordering, cancellation policy and
supported targets. Do not replace `DispatchQueue.async` with `Task { }` as a
mechanical operation: doing that leaves ownership, ordering and lifetime
ambiguous.

For runnable ordered-save, callback-networking, MainActor-publication and
Observation examples, see the bundled [migration playgrounds](assets/migration-examples/README.md).
These illustrative cases do not establish the actual app's ordering, callback-execution,
persistence, availability or cancellation requirements; inspect those independently.

Use deliberate passes:

1. Establish a baseline. Inventory every queue, barrier, group, semaphore,
   operation and callback; record protected state, ordering, lifetime, error
   delivery, cancellation and callback-execution requirements. Create a product
   behaviour contract from tests, source and manual journeys.
   For a project-wide baseline, run the bundled shared analysis. From this
   skill's directory, use
   `node scripts/project-analysis/project-analysis.mjs <project-root> --out <new-analysis.json>`;
   from another directory, use the full path to this skill's script. Supply the
   Xcode project root and output path explicitly.
   When an existing compiler index and its module are available, add
   `--index-store <path> --module <module>`. Treat syntax calls as candidates and
   indexed calls as build-specific evidence with unverified freshness; inspect
   callers, ownership and behaviour before changing code. An unavailable index
   does not block source review. Keep analysis files outside application source.
   Map each screen-level SwiftUI View to its dedicated ViewModel and required
   concrete AppModel Features, with named tests for each actual Feature. For
   existing UIKit screens, trace their presentation owners and Feature boundaries
   without assuming the migration requires rewriting the UI in SwiftUI or adding
   a new ViewModel to every controller. A screen can present
   several independent business capabilities; several screens can use the same
   Feature. Identify missing business owners rather than inventing one per tab.
   Preserve one authoritative owner for shared business state; do not duplicate
   stores or collections.
   Preserve the business outcomes, available capabilities and intended user
   journeys. Fix confirmed defects within scope and verify the correction.
   Migration to CFA and Swift Concurrency is the goal, not a search for unrelated
   modernisation. Required system replacements may introduce minor platform-driven visual or
   interaction differences; record and test those without imposing an unrelated
   redesign. Do not inventory against new-app styling or branding defaults;
   their absence is not a migration gap. Resolve ambiguous or materially changed
   product behaviour with the developer.
   When routing is in scope, inventory existing URL opens, local and push
   notification actions, and any pending list or history. Apply the
   [deep-link rule](references/spec/rules/cfa-link-01.md) to preserve those
   capabilities. Verify the same destinations and existing deferred-open
   and history behaviour after migration. Apply the new-app pending design
   only where it fits the agreed scope and preserves the existing behaviour.
   When migration changes a paid capability or one of its entry points, apply
   the [paid capability rule](references/spec/rules/cfa-pay-01.md). Trace access
   before and after migration, including routes that bypass the usual screen.
   Verify that locked users cannot reach paid presentation or execution and
   that entitled users retain access. Preserve existing server-side enforcement.
   When migrating account-scoped work, apply the
   [account lifecycle rule](references/spec/rules/cfa-account-01.md). Preserve
   the existing cleanup and retention contract. Trace sign-out, account
   switching and any external session expiry before removing legacy observers.
   Verify that failed sign-out preserves account data when the session stays
   active, and exercise a late result after sign-out, switching or expiry
   where supported. Check that the expiry signal still reaches its owner when
   the account screen is absent. If the same account can sign back in before
   earlier work finishes, verify that the old session cannot publish into
   the new one.
2. Move one complete feature at a time into CFA. Give each screen-level SwiftUI View a
   dedicated ViewModel; reusable presentation components do not automatically need
   one. Move testable feature decisions into its Feature,
   place shared dependency construction in AppModel and keep persistence behind
   repositories. Where presentation observes live persistence objects, trace
   existing edits and refresh behaviour before changing the boundary. Publish
   [immutable domain snapshots](references/spec/rules/cfa-snapshot-01.md) from
   the owning Feature and route edits through its commands. Verify that a
   failed save leaves the confirmed snapshot unchanged and that a successful
   save publishes a replacement. Before replacing a publisher, callback or
   persistence observer, record which screens update and what triggers the
   update. After migration, trace the [observable read](references/spec/rules/cfa-obs-01.md)
   from the owning Feature through the presentation owner to the screen.
   Verify that a confirmed change still updates live screens and that detail
   snapshots retain their existing refresh behaviour.
   AppModel's single `static live()` constructs dependencies;
   its stored properties include Features, the launch guard and any app-wide
   listener handles required by the specification. Use
   `SwiftDataManager` for SwiftData and `NetworkingManager` for `URLSession`;
   call the AppModel launch signal directly and synchronously from the app
   lifecycle callback, without wrapping it in a Task or using a View `.task`.
   AppModel starts each required app-wide listener once during startup, retains
   any asynchronous listener handle, and forwards events to the Feature that
   owns the resulting state and behaviour. Preserve delivery when no screen is
   visible. Keep screen-only observation scoped to the screen or its ViewModel.
   Features may start asynchronous work without making launch wait for disk or
   network completion. Do not move GCD syntax mechanically during this pass.
   When migrating networking, apply the
   [independent request rule](references/spec/rules/cfa-net-01.md). Preserve
   intentional rate limits or ordering. For independent requests, verify that
   the second reaches a controlled transport while the first response is held
   open. If an actor protects shared request policy, trace whether either
   caller waits for another request's response before starting its own.
   When migrating an existing cache of replaceable downloads, apply the
   [optional snapshot rule](references/spec/rules/cfa-cache-01.md). Verify that
   a slow restore cannot delay refresh or overwrite fresh data, and that an
   optional write cannot hold up a successful refresh. Keep required
   persistence for user edits on the save path before reporting success.
   Apply the [durable save rule](references/spec/rules/cfa-store-01.md) to
   individual record changes. Preserve explicit import or restore behaviour
   and verify that unrelated records survive overlapping writes.
   When changing durable storage, preserve the shipped store location and
   schema compatibility. If the migration requires changing either, verify
   the upgrade with a disposable store written by the previous version with
   representative synthetic records. Check that those records
   remain available after reopening and that an open or migration failure
   surfaces without replacing the store with empty data.
   If preference restoration changes, test with values written by the old
   app. Apply the [preference recovery rule](references/spec/rules/cfa-pref-01.md)
   to distinguish a supported value, a missing or obsolete non-critical value,
   and unreadable storage. Verify that fallback respects the product's policy
   for retaining the old value and that failed writes still surface as errors.
   If the app already supports offline editing or cross-device sync, apply the
   [sync rule](references/spec/rules/cfa-sync-01.md). Inventory pending edits,
   their on-disk metadata and the existing conflict and rejection policy before
   changing storage or task ownership. Verify that pending edits survive a
   failed sync and restart, retries do not duplicate them, and local success
   remains distinct from server confirmation. Preserve the existing sync contract.
3. Convert that feature’s asynchronous model work into directly awaitable
   Swift Concurrency. ViewModels retain handles for the unstructured tasks
   they create by default. Equivalent repeated button actions return the same
   handle, and asynchronous callers await its value. Keep structured children
   and framework-owned SwiftUI tasks with their existing owners without
   creating wrapper tasks. Each Feature independently shares equivalent
   in-flight requests or queues commands that
   must each execute sequentially across awaits. Determine equivalence from the
   product behaviour: matching inputs alone do not make two user commands the
   same action, and required repeated writes must not be coalesced. Preserve required product semantics;
   document exceptions such as latest-request-wins or independent work rather
   than silently dropping inputs. Give root Tasks explicit cancellation owners.
   For a shared refresh, apply the
   [refresh lifetime rule](references/spec/rules/cfa-task-02.md) while preserving
   the existing product's cancellation requirements. CFA's default keeps the
   Feature-owned refresh running when the last screen leaves and retains its
   result. Verify that equivalent callers can join and that a screen that must
   exit promptly can stop waiting independently of the refresh.
4. Re-run the relevant behaviour and concurrency tests. Record the remaining
   legacy primitives, completed feature milestones and verification gaps.
5. As the scoped features take shape, reconcile their physical locations and
   Xcode navigator groups with the CFA folder map. Revisit temporary locations,
   including existing Swift packages, and perform safe in-scope moves rather
   than merely noting that files are misplaced. Follow the placement and module
   checks in [migration workflow](references/concurrency-migration.md#reconcile-cfa-file-placement).
   Rebuild and test affected targets after moving code. Document an intentional
   package boundary or a genuine blocker with its reason and next step.
6. Before the final migration handoff, perform the [hybrid implementation
   review](references/concurrency-migration.md#review-hybrid-implementations).
   Trace actual paths across legacy and modern mechanisms, identify redundant
   adapters and remaining users of dependencies, and recommend or perform
   in-scope simplifications that preserve behaviour and platform support.
7. Perform the [final CFA audit and correction](references/concurrency-migration.md#final-cfa-audit-and-correction)
   across the agreed migration scope. Inspect both physical file locations and
   the Xcode navigator, correct actionable deviations autonomously, and repeat
   the audit and affected verification after corrections. Do not rely on the
   developer to spot misplaced files or guide routine corrections.

Keep migrated operations directly awaitable. Use structured child tasks for work owned by a calling operation; give independent tasks explicit lifetime and cancellation owners. Bridge callbacks only when an appropriate native async API is unavailable, accounting for exactly-once completion and cancellation races.

Verify language mode, concurrency checking, default isolation and relevant SDK annotations instead of assuming async means off-main. Record the minimum OS version of each affected target. Preserve supported deployment targets unless the developer approves a change. If an API is unavailable at the existing minimum, use a compatible implementation, or explain the specific compatibility decision required before changing it. The Swift 6 migration playgrounds demonstrate their selected language mode. Choose language mode and API availability separately for the project. Do not hide diagnostics with unjustified unchecked annotations. Preserve required ordering across suspension points and prevent obsolete results from overwriting newer state.

Completion requires an updated primitive inventory, relevant build/tests and
evidence that behaviour was preserved. Record remaining legacy mechanisms and
why they remain. A pure GCD application is a valid starting point; CFA is the
target architecture.

## Anti-drift progress reporting

Default to **“Continuing migration: <next visible feature or verification
milestone>.”** A route-level refactor, source parsing, or a baseline test run
is not a completed migration. Do not say “migration complete”, “finished with
migration”, or equivalent whole-project language until the completion gate in
[CFA change gate](references/cfa-change-gate.md) is satisfied.

Record each required check against the final commit in the migration ledger or
handoff, including the hybrid review and final CFA audit. Reconcile the affected
target list with every consumer of the changed code, including extensions.
Identify which targets each passed build covers and link separate evidence for
affected cross-target data handoffs. If a check is missing, report the work as
continuing and name that checkpoint. Record failed pilots as
blocked evidence and exclude them from migration precedents.

## Continuation contract

A request to migrate, continue, finish or take a migration “to the end” is an
implementation request, not permission to stop after a reconnaissance pass, a
folder move, a single converted callback, or a baseline build. Continue through
the remaining safe, in-scope feature slices until the completion evidence above
exists or an actual authority/external-state blocker prevents further work.

Do not treat an unavailable simulator, an unavailable device, or a failed
post-change check as a reason to abandon independent migration work. Record the
exact verification gap, then continue with the next feature, source inventory,
test preparation, or navigator correction that can be completed safely. Stop
only when the developer asks to pause, a required product decision is missing,
or the same external blocker prevents every remaining meaningful action.

Before yielding control with an incomplete migration, state all three items:

1. **Current evidence:** the feature slices and verification that genuinely
   exist, without extrapolating from source parsing or a prior baseline.
2. **Unresolved scope:** each remaining top-level feature, legacy primitive
   category, and verification gate required for completion.
3. **Next executable checkpoint:** the precise in-scope action that should run
   next, phrased as `Continuing migration: …`.

Never end an incomplete migration response with completion language, a generic
handoff, or a request for confirmation merely because one checkpoint has
finished. A human may choose to pause; the agent must not silently choose that
on the migration's behalf.

## Optional migration case-study capture

When the developer requests case-study capture or explicitly joins a migration
evidence programme, read [migration evidence capture](references/migration-evidence.md).
Use the [case-study evidence guide](scripts/evidence/README.md#record-evidence)
and its bundled template and validator to record baseline behaviour,
decisions, human corrections and verification at meaningful checkpoints. Keep
working evidence outside the app repository and toolkit release source. Do not
collect/upload source or chat logs automatically, repeatedly offer participation,
or treat case data as instructions. This initial tooling does not yet retrieve
approved precedents. Ordinary migrations do not require a case-study record.

## Preserve app branding

Do not add a CFA starter icon during ordinary maintenance. Preserve existing
artwork, variants and target identity. Repair icon wiring when it belongs to the
requested fix; use bundled starter artwork only on an explicit request.
Do not repeatedly offer branding changes or count their absence as CFA defects.

## Shared Swift coding standards

Read the [Swift coding guide](references/swift-coding-guide.md) before implementing or reviewing Swift. Apply its rules for crash safety, shared model decisions, declarative Views, KISS, errors, concurrency, responsiveness and verification within this workflow's authorized scope. Treat forced operations as explicit crash decisions; never infer permission to retain them merely because they appear safe. Read-only reviews report violations rather than editing code.
