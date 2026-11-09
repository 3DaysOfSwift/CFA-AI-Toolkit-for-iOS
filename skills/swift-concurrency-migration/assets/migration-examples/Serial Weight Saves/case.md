# Serial Weight Saves

## Starting point

A serial Dispatch queue accepts weight saves and invokes completion on its queue.

## Behaviour to preserve

Valid saves remain in the order admitted by the serial queue or Feature; invalid values are rejected. The runnable check uses three structured child tasks and awaits all three outcomes. Their declaration order does not guarantee the order in which they reach the Feature. The CFA Feature publishes only confirmed saves and can continue after failure.

## Migration

The Feature sequences saves and delegates storage through the `WeightSaving` repository contract, implemented here by an in-memory actor. Callers await the Feature's async save directly. This example keeps the legacy success/failure Boolean so the comparison preserves what each caller receives. An admitted save runs to completion even if its caller is cancelled. The Feature owns the save task, and the caller awaits that task’s result. Cancelling the caller neither cancels that task nor ends its wait for the result. A screen that needs to leave promptly needs a separate cancellation path for its wait. Check that this lifetime and the change from a completion callback to an async return match the original app’s contract.

## Run and verify

Open and run `Before.playground` and `After.playground`. Each prints `Passed:` after its assertions succeed. In a toolkit source checkout, also run the automated check described in the parent README.

## Boundaries

In-memory fixture; no actual disk failure or process restart. The shared automated
check also holds the first save open and verifies that admitted saves run in order
across a failing middle command. It does not cover every possible interleaving.
