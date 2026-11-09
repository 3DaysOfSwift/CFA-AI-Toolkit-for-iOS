# MainActor Result

## Starting point

Background callback work dispatches a result to the main queue.

## Behaviour to preserve

Both examples publish Artemis on MainActor before reporting completion. The migrated example also demonstrates failure and retry: a failed refresh keeps the last confirmed value, and a successful retry clears the error.

## Migration

The Feature awaits its provider and publishes observable state on MainActor. This fixture queues every refresh in admission order, including requests with different inputs. Callers await their own refresh through publication.

## Run and verify

Open and run `Before.playground` and `After.playground`. Each prints `Passed:` after its assertions succeed. In a toolkit source checkout, also run the automated check described in the parent README.

## Boundaries

The legacy example does not model failure; cancellation and real network work are outside this case.
