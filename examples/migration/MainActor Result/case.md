# MainActor Result

## Starting point

Background callback work dispatches a result to the main queue.

## Behaviour to preserve

Both examples publish Artemis on MainActor before reporting completion. The
After fixture adds a separate demonstration of failure and retry. A failed
refresh keeps the last confirmed value, and a successful retry clears the
error. Use the existing app’s failure and retry behaviour as the contract
when applying the pattern to a migration.

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

The Feature exposes a typed failure and uses `nil` until it has a confirmed
launch name. A screen ViewModel supplies any error or empty-state text.

## Run and verify

Open and run `Before.playground` and `After.playground`. Each prints `Passed:` after its assertions succeed. In a toolkit source checkout, also run the automated check described in the parent README.

## Boundaries

The playground uses a stateless value type to simulate the provider outcome.
Its async method shows the call boundary without simulating network timing.
The legacy example only models success and accepts every submitted call.
The migrated fixture preserves admission even when the caller is already
cancelled. Once admitted, a refresh runs to completion even if its caller is cancelled. The Feature owns the task, and the caller awaits its result. Cancelling the caller neither cancels that task nor ends its wait for the result. A screen that needs to leave promptly needs a separate cancellation path for its wait. The automated check holds the first request open, admits a second request
and cancels its caller. The first request then fails, and the second still
succeeds. This verifies queue order and the Feature-owned lifetime with a
controlled provider. It also verifies that a caller cancelled before entering
the Feature still receives the outcome of its own refresh. Actual transport cancellation and timeouts are outside
the example’s scope.
