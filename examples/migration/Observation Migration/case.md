# Observation Migration

## Starting point

A MainActor ObservableObject publishes changes with Combine.

## Behaviour to preserve

Both models record two completed days and expose a count of two. This is the
state behaviour the migration preserves. The legacy Combine subscription
notifies twice. The migrated example's first tracking registration notifies
once, then re-registering reads the current count and tracks a later change.
This example preserves the count and the ability to observe current state.
It does not preserve a notification for every mutation.

## Migration

The Feature and ViewModel use `@Observable` and are isolated to `@MainActor`.
`HabitView` constructs its own private State-backed ViewModel. The ViewModel
defaults to the Feature supplied by `AppModel.shared`, which uses a single
`live()` factory. The example focuses on observation and composition without
an app launch callback. The runnable check supplies a Feature from an isolated
AppModel and reads the count through the ViewModel’s computed property. It
verifies that a new tracking registration receives a later change and that a
ViewModel from a separate graph keeps its own count. SwiftUI normally
establishes observation as it evaluates the properties a View reads; manual
re-registration is shown here to make one-shot tracking visible.

## Run and verify

Open and run `Before.playground` and `After.playground`. Each prints `Passed:` after its assertions succeed. In a toolkit source checkout, also run the automated check described in the parent README.

## Boundaries

Observation needs iOS 17/macOS 14 or newer. The counter is in memory. A
Feature that records durable completions publishes the updated count after
the required save succeeds. The SwiftUI screen demonstrates the observation route. The runnable check exercises that route from the ViewModel without rendering the screen. The re-registration demonstrates reading the
latest state. If an existing subscriber must process every completion event,
keep an event API that delivers every required occurrence. Test consecutive
equal-valued events, ordering and cancellation separately from the final
count displayed on screen.
