# Observation Migration

## Starting point

A MainActor ObservableObject publishes changes with Combine.

## Behaviour to preserve

Both models record the first two completed days through separate calls. The Combine subscription notifies twice, while the first Observation registration notifies once. The migrated check then reads the latest value during re-registration and verifies that a third change notifies the new observer.

## Migration

The Feature and ViewModel use `@Observable` and are isolated to `@MainActor`.
The runnable check reads the count through the ViewModel’s computed property,
then verifies that a new tracking registration receives a later change. SwiftUI normally
establishes observation as it evaluates the properties a View reads; manual
re-registration is shown here to make one-shot tracking visible.

## Run and verify

Open and run `Before.playground` and `After.playground`. Each prints `Passed:` after its assertions succeed. In a toolkit source checkout, also run the automated check described in the parent README.

## Boundaries

Observation needs iOS 17/macOS 14 or newer. The counter is in memory. A
Feature that records durable completions publishes the updated count after
the required save succeeds. In an app, the View observes the Feature’s state
through its screen ViewModel. The re-registration demonstrates reading the
latest state. If an existing subscriber must process every completion event,
preserve and verify that delivery contract separately.
