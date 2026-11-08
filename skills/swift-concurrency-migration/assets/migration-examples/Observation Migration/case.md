# Observation Migration

## Starting point

A MainActor ObservableObject publishes changes with Combine.

## Behaviour to preserve

Both models reach two completed days. Combine notifies twice; one Observation tracking registration notifies once.

## Migration

The Feature uses @Observable; UI isolation remains explicit. The runnable check
shows a second tracking registration receiving a later change. SwiftUI normally
establishes observation as it evaluates the properties a View reads; manual
re-registration is shown here to make one-shot tracking visible.

## Run and verify

Open and run `Before.playground` and `After.playground`. Each prints `Passed:` after its assertions succeed. Run the shared automated check described in the parent README.

## Boundaries

Observation needs iOS 17/macOS 14 or newer; it does not replace Combine stream operators or demonstrate SwiftUI rendering.
