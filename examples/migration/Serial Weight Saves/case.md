# Serial Weight Saves

## Starting point

A serial Dispatch queue accepts weight saves and invokes completion on its queue.

## Behaviour to preserve

Valid saves remain in the order admitted by the serial queue or Feature; invalid values are rejected. The Before check submits three callbacks to the serial queue in a known order.
The After check first saves sequentially, then uses three structured child
tasks and awaits every outcome. The children can reach the Feature in a
different order from their declarations. The CFA Feature publishes only
confirmed saves and continues processing after failure.

## Migration

The Feature sequences saves and delegates storage through the `WeightSaving` repository contract, implemented here by an in-memory actor. Callers await the Feature's async save directly. This example keeps the legacy success/failure Boolean so the comparison preserves what each caller receives. The legacy queue accepts every submission. To preserve that contract, the migrated Feature admits a save even when its caller is already cancelled. An admitted save runs to completion even if its caller is cancelled. The Feature owns the save task, and the caller awaits that task’s result. Cancelling the caller neither cancels that task nor ends its wait for the result. A screen that needs to leave promptly needs a separate cancellation path for its wait. Check that this lifetime and the change from a completion callback to an async return match the original app’s contract.

The Feature exposes a typed failure. A screen ViewModel can turn it into
user-facing text.

## Run and verify

Open and run `Before.playground` and `After.playground`. Each prints `Passed:` after its assertions succeed. In a toolkit source checkout, also run the automated check described in the parent README.

## Boundaries

In-memory fixture; no actual disk failure or process restart. The shared automated
check also holds the first save open and verifies that admitted saves run in order
across a failing middle command. It also verifies that two identical admitted
saves both take effect, and that the queue releases its last admission after
completion. A fresh save then succeeds after the queue has drained.
