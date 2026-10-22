---
name: swift-concurrency-migration
description: Legacy GCD migration: migrate GCD, OperationQueue and callback-based iOS apps to Cooperative Feature Architecture and Swift Concurrency while preserving product behaviour. Use when a developer asks to modernise or migrate a legacy iOS codebase; not for a small isolated API conversion.
---

# Legacy GCD migration

Read [project workflow and design authority](references/project-workflow.md) first.
Respect the recorded workflow and current request; new-app design defaults do
not authorize UI changes during maintenance or a narrowly scoped task.

Migrate a legacy application into CFA and Swift Concurrency by preserving its
product behaviour, not translating concurrency syntax.

Read [CFA specification](references/cfa-specification.md), [CFA change gate](references/cfa-change-gate.md), [reference feature](references/reference-feature.md), [migration workflow](references/concurrency-migration.md) and [product behaviour contract](references/product-behaviour-contract.md).

This is a CFA migration. It changes the architecture as well as legacy GCD,
OperationQueue and callback implementation details. Preserve user-visible
behaviour, stored data, error delivery, ordering, cancellation policy and
supported targets. Do not replace `DispatchQueue.async` with `Task { }` as a
mechanical operation: doing that leaves ownership, ordering and lifetime
ambiguous.

Use deliberate passes:

1. Establish a baseline. Inventory every queue, barrier, group, semaphore,
   operation and callback; record protected state, ordering, lifetime, error
   delivery, cancellation and callback-execution requirements. Create a product
   behaviour contract from tests, source and manual journeys.
   Map each top-level app tab to its own concrete Feature, matching AppModel
   property, dedicated screen ViewModel and named Feature tests. Correct missing
   tab owners during their migration checkpoint, preserving one authoritative
   owner for data shared by several tabs; do not duplicate stores or collections.
   Preserve existing visuals and interactions as part of that contract. Do not
   inventory against new-app palette counts, popup selectors or branding
   defaults; their absence is not a migration gap. Make visual changes only
   when explicitly requested, with separate regression evidence.
2. Move one complete feature at a time into CFA. Give each SwiftUI View a
   bespoke ViewModel, move testable feature decisions into its Feature,
   place shared dependency construction in AppModel and keep persistence behind
   repositories. AppModel's single `static live()` constructs dependencies,
   while its stored properties are only Features and the launch guard. Use
   `SwiftDataManager` for SwiftData and `NetworkingManager` for `URLSession`;
   signal launch from the app lifecycle, not a View `.task`. Do not move GCD
   syntax mechanically during this pass.
3. Convert that feature’s asynchronous model work into directly awaitable
   Swift Concurrency. ViewModels retain created task handles by default and
   equivalent repeated actions await the shared execution. Each Feature
   independently shares equivalent in-flight requests or queues distinct
   commands sequentially across awaits. Preserve required product semantics;
   document exceptions such as latest-request-wins or independent work rather
   than silently dropping inputs. Give root Tasks explicit cancellation owners.
4. Re-run the relevant behaviour and concurrency tests. Record the remaining
   legacy primitives, completed feature milestones and verification gaps.

Keep migrated operations directly awaitable. Use structured child tasks for work owned by a calling operation; give independent tasks explicit lifetime and cancellation owners. Bridge callbacks only when an appropriate native async API is unavailable, accounting for exactly-once completion and cancellation races.

Verify language mode, concurrency checking, default isolation and relevant SDK annotations instead of assuming async means off-main. Do not hide diagnostics with unjustified unchecked annotations. Preserve required ordering across suspension points and prevent obsolete results from overwriting newer state.

Completion requires an updated primitive inventory, relevant build/tests and
evidence that behaviour was preserved. Record remaining legacy mechanisms and
why they remain. A pure GCD application is a valid starting point; CFA is the
target architecture.

## Preserve app branding

Do not add a CFA starter icon during ordinary maintenance. Preserve existing
artwork, variants and target identity. Repair icon wiring when it belongs to the
requested fix; use bundled starter artwork only on an explicit request.
Do not repeatedly offer branding changes or count their absence as CFA defects.

## Shared Swift coding standards

Read the [Swift coding guide](references/swift-coding-guide.md) before implementing or reviewing Swift. Apply its rules for crash safety, shared model decisions, declarative Views, KISS, errors, concurrency, responsiveness and verification within this workflow's authorized scope. Treat forced operations as explicit crash decisions; never infer permission to retain them merely because they appear safe. Read-only reviews report violations rather than editing code.
