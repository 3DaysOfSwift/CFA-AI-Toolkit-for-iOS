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
A detail View may construct its own State-backed ViewModel from selected value data
in its initializer. Never inject or share ViewModels; keep screen and scene navigation selections
out of Features. Review-only work
reports violations; tests inject Features into ViewModels, not ViewModels into Views.

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
2. Move one complete feature at a time into CFA. Give each screen-level SwiftUI View a
   dedicated ViewModel; reusable presentation components do not automatically need
   one. Move testable feature decisions into its Feature,
   place shared dependency construction in AppModel and keep persistence behind
   repositories. AppModel's single `static live()` constructs dependencies;
   its stored properties include Features, the launch guard and any app-wide
   listener handles required by the specification. Use
   `SwiftDataManager` for SwiftData and `NetworkingManager` for `URLSession`;
   call the AppModel launch signal directly and synchronously from the app
   lifecycle callback, without wrapping it in a Task or using a View `.task`.
   Features may start asynchronous work without making launch wait for disk or
   network completion. Do not move GCD
   syntax mechanically during this pass.
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

Verify language mode, concurrency checking, default isolation and relevant SDK annotations instead of assuming async means off-main. Do not hide diagnostics with unjustified unchecked annotations. Preserve required ordering across suspension points and prevent obsolete results from overwriting newer state.

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
handoff, including the hybrid review and final CFA audit. If a check is missing,
report the work as continuing and name that checkpoint. Record failed pilots as
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
