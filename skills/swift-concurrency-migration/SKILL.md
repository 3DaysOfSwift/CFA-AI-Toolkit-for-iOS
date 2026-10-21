---
name: swift-concurrency-migration
description: Legacy GCD migration: migrate GCD, OperationQueue and callback-based iOS apps to Cooperative Feature Architecture and Swift Concurrency while preserving product behaviour. Use when a developer asks to modernise or migrate a legacy iOS codebase; not for a small isolated API conversion.
---

# Legacy GCD migration

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
2. Move one complete feature at a time into CFA. Give each SwiftUI View a
   bespoke ViewModel, move testable feature decisions into its Feature,
   place shared dependency construction in AppModel and keep persistence behind
   repositories. AppModel's single `static live()` constructs dependencies,
   while its stored properties are only Features and the launch guard. Use
   `SwiftDataManager` for SwiftData and `NetworkingManager` for `URLSession`;
   signal launch from the app lifecycle, not a View `.task`. Do not move GCD
   syntax mechanically during this pass.
3. Convert that feature’s asynchronous model work into directly awaitable
   Swift Concurrency. Choose a deliberate policy for serial durable saves,
   reject-while-busy operations, latest-request-wins work and independent work.
   Give independent root Tasks an explicit owner and cancellation policy.
4. Re-run the relevant behaviour and concurrency tests. Record the remaining
   legacy primitives, completed feature milestones and verification gaps.

Keep migrated operations directly awaitable. Use structured child tasks for work owned by a calling operation; give independent tasks explicit lifetime and cancellation owners. Bridge callbacks only when an appropriate native async API is unavailable, accounting for exactly-once completion and cancellation races.

Verify language mode, concurrency checking, default isolation and relevant SDK annotations instead of assuming async means off-main. Do not hide diagnostics with unjustified unchecked annotations. Preserve required ordering across suspension points and prevent obsolete results from overwriting newer state.

Completion requires an updated primitive inventory, relevant build/tests and
evidence that behaviour was preserved. Record remaining legacy mechanisms and
why they remain. A pure GCD application is a valid starting point; CFA is the
target architecture.

## Shared Swift coding standards

Read the [Swift coding guide](references/swift-coding-guide.md) before implementing or reviewing Swift. Apply its rules for crash safety, shared model decisions, declarative Views, KISS, errors, concurrency, responsiveness and verification within this workflow's authorized scope. Treat forced operations as explicit crash decisions; never infer permission to retain them merely because they appear safe. Read-only reviews report violations rather than editing code.
