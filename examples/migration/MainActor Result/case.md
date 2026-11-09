# MainActor Result

## Starting point

Background callback work dispatches a result to the main queue.

## Behaviour to preserve

Both examples publish Artemis on MainActor before reporting completion. The migrated example also demonstrates failure and retry: a failed refresh keeps the last confirmed value, and a successful retry clears the error.

## Migration

The Feature awaits its provider and publishes observable state on MainActor. In this fixture, each call supplies its own simulated provider outcome through
`available`. The fixture treats each call as a distinct command so every
outcome is processed in admission order. Each caller receives its own success
or failure after the Feature publishes it.

Apply the CFA overlapping-call rule (`CFA-SPEC-TASK-01`) to choose the
policy from what each caller needs. Share one Feature-owned request when
launch and several screens can use the same response. Let independent
requests progress in parallel. Queue commands only when each must take effect
in order, as this fixture requires for its simulated publications.

## Run and verify

Open and run `Before.playground` and `After.playground`. Each prints `Passed:` after its assertions succeed. In a toolkit source checkout, also run the automated check described in the parent README.

## Boundaries

The playground uses a stateless value type to simulate the provider outcome.
Its async method shows the call boundary without simulating network timing.
The legacy example only models success. Once admitted, a refresh runs to completion even if its caller is cancelled. The Feature owns the task, and the caller awaits its result. Cancelling the caller neither cancels that task nor ends its wait for the result. A screen that needs to leave promptly needs a separate cancellation path for its wait. The automated check holds the first request open, admits a second request
and cancels its caller. The first request then fails, and the second still
succeeds. This verifies queue order and the Feature-owned lifetime with a
controlled provider. Actual transport cancellation and timeouts are outside
the example’s scope.
