# Observation Migration

## Starting point

A MainActor ObservableObject publishes changes with Combine.

## Behaviour to preserve

Both models record the first two completed days through separate calls. The Combine subscription notifies twice, while the first Observation registration notifies once. The migrated check then reads the latest value during re-registration and verifies that a third change notifies the new observer.

## Migration

The Feature uses @Observable; UI isolation remains explicit. The runnable check
shows a second tracking registration receiving a later change. SwiftUI normally
establishes observation as it evaluates the properties a View reads; manual
re-registration is shown here to make one-shot tracking visible.

## Run and verify

Open and run `Before.playground` and `After.playground`. Each prints `Passed:` after its assertions succeed. In a toolkit source checkout, also run the automated check described in the parent README.

## Boundaries

Observation needs iOS 17/macOS 14 or newer. This case covers the Feature’s observable state. In an app, the View observes that state through its screen ViewModel. A migration that relies on receiving every event still needs to verify its delivery contract.
