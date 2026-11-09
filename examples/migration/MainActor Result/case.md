# MainActor Result

## Starting point

Background callback work dispatches a result to the main queue.

## Behaviour to preserve

Both examples publish Artemis on MainActor before reporting completion. The migrated example also demonstrates failure and retry: a failed refresh keeps the last confirmed value, and a successful retry clears the error.

## Migration

The Feature awaits its provider and publishes observable state on MainActor. This fixture queues every refresh in admission order, including requests with different inputs. Each caller receives its own success or failure after the Feature publishes the outcome.

## Run and verify

Open and run `Before.playground` and `After.playground`. Each prints `Passed:` after its assertions succeed. In a toolkit source checkout, also run the automated check described in the parent README.

## Boundaries

The legacy example only models success. Once admitted, a refresh runs to completion even if its caller is cancelled. The Feature owns the task, and the caller awaits its result. The automated check holds the first request open, admits a second request
and cancels its caller. The first request then fails, and the second still
succeeds. This verifies queue order and the Feature-owned lifetime with a
controlled provider. Actual transport cancellation and timeouts are outside
the example’s scope.
