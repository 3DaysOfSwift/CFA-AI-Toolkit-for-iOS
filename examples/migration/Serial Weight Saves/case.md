# Serial Weight Saves

## Starting point

A serial Dispatch queue accepts weight saves and invokes completion on its queue.

## Behaviour to preserve

Valid saves remain in submission order; invalid values are rejected. The CFA Feature publishes only confirmed saves and can continue after failure.

## Migration

The Feature sequences saves and delegates storage to an actor. Callers now await a Task; a real migration must check the original completion queue and cancellation contract.

## Run and verify

Open and run `Before.playground` and `After.playground`. Each prints `Passed:` after its assertions succeed. Run the shared automated check described in the parent README.

## Boundaries

In-memory fixture; no actual disk failure, process restart or adversarial interleaving.
