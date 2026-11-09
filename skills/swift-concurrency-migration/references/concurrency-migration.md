# Legacy GCD migration workflow

Adopt CFA while preserving product behaviour. Begin at an operation boundary with known behaviour.

## Reconcile CFA file placement

Before implementation, map the scoped app and its packages, targets, source
roots and Xcode navigator groups against the folder map in the CFA specification.
For each migrated slice, choose its intended View, AppModel/Features or supporting
storage location. When an existing dependency forces a temporary location, record
both the current and intended locations and the dependency preventing the move.

As features are migrated, revisit that list; before declaring the scoped migration
complete, compare the actual on-disk paths and Xcode navigator with the intended
map. Move misplaced CFA files into their intended locations when safe and within
scope. A feature folder inside an unrelated pre-existing Swift package is not
automatically the intended app-level location just because its contents are
grouped together. Conversely, a package may be the intentional home of a shared
module: do not dismantle it, change its public API, or assume its files can be
moved into the app target without checking its consumers and build constraints.

For each move, preserve the relevant target memberships, package product and
module boundaries, imports, access control, resources, build settings and tests.
Update Xcode project or package references as appropriate, then build and run the
affected targets and behaviour tests. Verify both filesystem and navigator; a
cosmetic group alone does not move files or prove that they compile in the right
target. Keep an intentional package placement when it is required or explicitly
agreed, explain why it differs from the default map, and report an unresolved
move and its concrete blocker rather than silently treating it as complete.

If an existing widget or device target uses Model code that moves, apply the
[multi-device rule](spec/rules/cfa-device-01.md). Verify the affected target
still compiles with its shared Model and target-specific presentation. Preserve
its existing data handoff and verify changed paths within the migration scope.

## Final CFA audit and correction

After the scoped feature migration and placement and hybrid reviews, audit the
actual first-party source, tests, targets, packages, filesystem and Xcode navigator
against the CFA specification and change gate. Cover the agreed migration scope using the [CFA review checklist](spec/topics/29-review-checklist.md).
Record evidence for each applicable requirement and a reason for each
inapplicable one. For paid capabilities, include alternate entry points and
locked and entitled outcomes. Record unresolved paths as unverified. Document
any intentional exception against the product constraints and explain its
effect on the scoped conformance verdict.

For every misplaced file, compare its actual disk path and navigator group with
the appropriate CFA location, including files temporarily placed in an existing
package. Apply the placement checks above. Correct identified, safe in-scope
deviations yourself without waiting for the developer to identify each file or
approve routine moves. Update target membership and references, preserve the
product and verify the affected builds and tests.

Re-audit the changed areas and the full scoped placement map after corrections;
repeat while actionable deviations remain. Before calling the scoped migration
complete, satisfy the [migration completion gate](cfa-change-gate.md#migration-progress-and-completion-language).
The final source audit supplies evidence for that gate. The completion record
also requires manual behaviour regression and a human architecture review. If an
actual dependency, incompatible requirement or unavailable verification blocks
completion, continue independent work and state the specific remaining issue
and evidence. Do not claim whole-project compliance beyond what was inspected
or silently treat an incomplete audit as a pass.

## Review hybrid implementations

Near the end of a migration, scan the scoped first-party targets, extensions,
tests and dependencies for remaining reactive frameworks, callbacks, Combine,
Observation and other relevant mechanisms. Trace each meaningful boundary from
the source of state or asynchronous work to its consumers. For example, an
async Feature may still publish its results through a ReactiveSwift signal to
an existing UIKit screen. Identify who owns the state, transformations,
subscriptions and lifetime, and whether an adapter remains necessary.

For each hybrid path, distinguish a temporary bridge or duplicate state from a
deliberate integration. Assess whether a simpler supported design can preserve
the existing screen's update timing, ordering, initial and subsequent values,
errors, cancellation, subscription lifetime, threading and other observable
behaviour. Observation is available on iOS 17 and later; it is not a drop-in
replacement for reactive stream operators. Choose a mechanism supported by the
project's deployment targets and consumers, and keep Combine or an existing
reactive framework where its capabilities or integrations are still required.
Using a framework alongside Swift Concurrency is not, by itself, a defect.

Implement safe, in-scope cleanup when the migration request authorizes it;
otherwise provide a concrete recommendation and its trade-offs. Remove an
adapter or dependency only after checking all target and package consumers,
including tests and public APIs, and verifying the affected builds and behaviour.
Record remaining hybrids with their purpose and next step; do not call a project
fully migrated to a single mechanism when scoped consumers still require another.

## Preserve concurrency guarantees

First establish the CFA boundary for one complete feature: a dedicated ViewModel
for each screen-level SwiftUI View, a concrete Feature for business decisions
and AppModel for composition. Reusable presentation components do not
automatically need their own ViewModel. Then migrate asynchronous model work
below the View layer. Keep SwiftUI declarative until the Model exposes useful,
directly testable async functions.

Inventory every queue, group, barrier, semaphore, callback, delegate, and
operation. For each one, determine:

- which work must begin concurrently;
- which work must remain ordered;
- which mutable state the original queue protects;
- whether work is durable, replaceable, cancellable, or long-lived;
- which caller needs the result and on which actor state is published; and
- how errors and cancellation currently behave.

Maintain a concurrency inventory alongside the migration ledger. For every
legacy primitive in scope, record the guarantee it currently provides, its
intended Swift Concurrency replacement or the concrete reason it must remain,
and the test or observation that shows the guarantee was preserved. An adapter
or framework-required primitive can remain when removing it would break a
supported integration or change required behaviour; do not retain one merely
to avoid the migration work.

Replace behaviour, not syntax. Do not mechanically translate `DispatchQueue`
calls into `Task`, actors, continuations, `async let`, or task groups. Preserve
the ordering, lifetime, isolation, and concurrency guarantees required by the
product. Keep feature commands as `async` functions that tests can call and
await directly.

When adapting callback APIs, prefer a native async API when it preserves the
required behaviour and is available on the supported platforms. Use a checked
continuation when a callback bridge is needed. Prove that every execution path resumes the
continuation exactly once, including success, failure, cancellation, and early
exit paths. A continuation is a bridge to an existing callback lifetime; it
must not invent different cancellation or ordering behaviour.

**Completion gate:** Tests at the existing business-logic boundary prove the migrated
implementation independently of SwiftUI; every legacy primitive is resolved in
the concurrency inventory; required ordering and parallelism are preserved;
mutable state has explicit isolation; errors remain visible; and cancellation
cannot publish stale results.


## Verify execution and responsiveness

Evaluate whether the application genuinely uses Swift Concurrency to remain
responsive—not merely whether GCD syntax has disappeared. Trace important
execution paths from user intent through the feature and its dependencies.
Record actor isolation, synchronous work, suspension points, task ownership,
and the executor on which work resumes. A Task is not automatically background
execution, and an async function does not guarantee that expensive work leaves
the Main Actor.

Review startup, persistence, parsing, device setup, animation, and repeated
calculations for blocking calls or excessive Main Actor work. Profile realistic
workloads on representative devices; distinguish potential risks found in code
from measured delays. Use the findings to choose explicit execution ownership,
appropriate asynchronous APIs, or caching. Moving a blocking call into an actor
or detached Task alone does not make it cooperative; respect external API
execution requirements and avoid blocking cooperative-pool threads.

When moving an app-wide subscription, verify that repeated launch signals
start one listener, that an event reaches the owning Feature without its screen
present, and that cancellation or replacement stops the old listener when
required. Check that the existing event delivery and lifetime are preserved.
For screen-only subscriptions, verify that leaving the screen ends observation
when its presentation lifetime ends.

Review Task cancellation, replacement, retention, priority, and stale-result
prevention. Keep short synchronous operations synchronous. Use structured
concurrency when independent child operations belong to one workflow; do not
manufacture parallelism. Use suspending waits instead of blocking sleeps.
Task.yield() is an optional opportunity for other work to run, not a guarantee
of fairness or a substitute for moving expensive work off the UI executor.
Do not add Task, async, await, or yield solely for demonstration.

Verify complete concurrency checking for the selected language mode and targets.
Resolve findings without weakening required behaviour or silencing diagnostics
through unjustified unchecked annotations. Complement deterministic test doubles
with tests of real task lifetimes and focused runtime measurements. For
timing-sensitive features, compare cadence, cancellation, and missed-deadline
behaviour under load; cooperative scheduling is not a real-time guarantee.

Record compiler settings, tested build and device, workloads, measurements,
remaining risks, and proposed improvements in the migration ledger. Implement
agreed refinements in bounded iterations and repeat affected regression tests.

**Completion gate:** execution ownership and meaningful suspension points are
understood; concurrency diagnostics are resolved; task lifetimes are verified;
and representative runtime evidence supports the application's responsiveness
and timing requirements. Missing profiling or device access remains an explicit
verification gap—not a claim that the app never blocks the main thread.
