## Make Concurrency Behaviour Honest and Visible

An `async` feature method is a testable unit of work. It is not itself a `Task`.
A `Task` represents the initiated lifetime of asynchronous work.

### Default: retained ViewModel tasks and shared completion

Each ViewModel retains a named handle for every unstructured `Task` it creates
by default. Use one handle per independently managed operation, or keyed handles
when independent records need independent work. Equivalent repeated button
actions reuse the existing execution rather than create another task. A
synchronous button-facing method returns the existing/new handle; asynchronous
callers and tests await that same handle's `value` for completion. If a lifecycle
task awaits an unstructured task this way, cancellation does not automatically
pass to the awaited task. The task's owner applies the operation's cancellation
policy. Do not create a new wrapper
task for every tap just to wait, or silently return from an async operation
while its requested work is still unfinished.

Install the handle before the first suspension. The following main-actor
ViewModel example returns the same handle for repeated refresh requests:

```swift
@discardableResult
func refresh() -> Task<Void, Never> {
    if let refreshTask { return refreshTask }

    let refreshTask = Task { [weak self, itemsFeature] in
        defer { self?.refreshTask = nil }
        await itemsFeature.refresh()
    }
    self.refreshTask = refreshTask
    return refreshTask
}
```

Clear the stored task after publishing its outcome, on success, failure and
cancellation, so a later request can start again. Cleanup from an obsolete
execution must not clear a newer handle. Task tracking and cancellation are
screen behaviour and must not accumulate in the View. The ViewModel still
exposes clear intent methods, and the Feature owns the underlying business
workflow and shared request policy. Framework-owned View `.task` and structured
child tasks retain their existing owners; do not manufacture stored wrapper
tasks for them. Document departures from the retained-task default with a
concrete lifetime requirement. Retaining a handle does not require cancelling
a durable save when its screen disappears.

A SwiftUI View must never store a `Task` handle in a stored property or in
`@State` so it can inspect or cancel that work later. Its custom ViewModel owns
the screen's explicitly created task lifetimes from the start.
The View continues to render the ViewModel's observable state and report user
intent; the ViewModel stores, replaces, or cancels the Task.

Other retained task lifetimes include:

- cancelling an obsolete progress calculation when a new range is selected;
- AppModel retaining an app-wide StoreKit transaction observer;
- sharing a Feature-owned refresh among callers from several scenes.

### Each Feature owns its overlapping-call policy

ViewModel protection is not enough: another screen, lifecycle callback or
Feature may call the same API. Each asynchronous Feature operation must define
its policy at the Feature boundary:

- **Share execution:** equivalent calls await one retained in-flight task and
  receive its outcome. Determine equivalence from the operation, its inputs and
  the intended product behavior: matching inputs alone do not make separate
  commands duplicates when each command must take effect.
- **Queue execution:** when every command must execute, admit calls to an
  explicit asynchronous sequential queue. Finish the whole operation, including
  suspension points, before starting the next admitted command. Each caller
  awaits its own outcome. Define cancellation, failure and cleanup so no waiter
  is lost and a failed command does not accidentally strand later commands.

These are the default policies. Reject-while-busy, latest-request-wins or
independent execution needs a documented product reason. Never discard a new
edit or return another record's result as duplicate suppression. Preserve
independent work instead of serializing the entire app. Actors and `@MainActor`
do not serialize whole operations across `await`; coordinate without blocking
threads. Keep queue admission separate from admitted internal work to avoid
an operation awaiting itself. A cancelled waiter must not accidentally cancel
shared work still needed by other callers.

Choose the lifetime deliberately:

- durable commands such as persistence normally continue after presentation
  disappears;
- a Feature-owned shared refresh normally continues when a screen leaves, even
  if that screen was its only current caller. Keep successfully downloaded
  data in the Feature for later use, and let equivalent future callers join the
  in-flight request. A departing screen may stop waiting without cancelling
  the Feature's refresh; choose a different policy only for a specific product
  or resource requirement;
- replaceable work such as searches, previews, and recalculations cancels when
  superseded;
- presentation-only work cancels when its screen disappears if continuing would
  have no value;
- long-lived observers are stored by the app-scoped owner and cancelled when
  that owner ends.

Cancellation is cooperative. Check cancellation before expensive work and
again before publishing its result. A cancelled older operation must never
overwrite newer state.

Prefer structured concurrency (`async let` or task groups) when child work
belongs to one parent operation. Use unstructured Tasks when the lifetime must
outlive the current call or be independently stored and managed.

Do not use `@unchecked Sendable` to silence a warning unless the type genuinely
maintains a documented thread-safety invariant. `Sendable` communicates safety;
it does not create safety. Prefer actor isolation, immutable value types, and
explicit task boundaries.

Do not change required concurrent behaviour into sequential behaviour simply to
make compiler diagnostics disappear or make code look easier. Code defines the
application's behaviour. Preserve independent startup and refresh operations as
independent work when the product requires them to begin together.

Main-actor isolation protects UI-observed state; it is not permission to perform
expensive work on the UI executor. File parsing, CPU-heavy calculations, image
processing, and blocking external work operate outside the Main Actor using
immutable `Sendable` inputs. Return to the Main Actor to publish the result.

Actors are reentrant across `await`. Revalidate assumptions after suspension.
When newer requests supersede older ones, use cancellation, operation identity,
or revision checks so stale work cannot publish over current state. Do not leave
observable state temporarily inconsistent across an `await` unless that
intermediate state is intentional and representable.

