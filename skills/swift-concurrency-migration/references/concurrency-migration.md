# Legacy GCD migration workflow

Adopt CFA while preserving product behaviour. Begin at an operation boundary with known behaviour.

## Preserve concurrency guarantees

First establish the CFA boundary for one complete feature: a bespoke ViewModel
for each View, a concrete Feature for business decisions and AppModel for
composition. Then migrate asynchronous model work below the View layer. Keep
SwiftUI declarative until the Model exposes useful, directly testable async
functions.

Inventory every queue, group, barrier, semaphore, callback, delegate, and
operation. For each one, determine:

- which work must begin concurrently;
- which work must remain ordered;
- which mutable state the original queue protects;
- whether work is durable, replaceable, cancellable, or long-lived;
- which caller needs the result and on which actor state is published; and
- how errors and cancellation currently behave.

Maintain a concurrency inventory alongside the migration ledger. For every
legacy primitive, record the guarantee it currently provides, its intended
Swift Concurrency replacement, and the test or observation that proves the
guarantee was preserved.

Replace behaviour, not syntax. Do not mechanically translate `DispatchQueue`
calls into `Task`, actors, continuations, `async let`, or task groups. Preserve
the ordering, lifetime, isolation, and concurrency guarantees required by the
product. Keep feature commands as `async` functions that tests can call and
await directly.

When adapting callback APIs, use a checked continuation only when an async API
is not already available. Prove that every execution path resumes the
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
