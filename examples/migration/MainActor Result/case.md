# MainActor Result

## Starting point

Background callback work dispatches a result to the main queue.

## Behaviour to preserve

Both examples publish Artemis on MainActor. The migrated example also retains the previous value if a later refresh fails.

## Migration

The Feature awaits its provider and publishes observable state on MainActor.

## Run and verify

Open and run `Before.playground` and `After.playground`. Each prints `Passed:` after its assertions succeed. Run the shared automated check described in the parent README.

## Boundaries

The legacy example does not model failure; overlapping requests, cancellation and real network work are outside this case.
