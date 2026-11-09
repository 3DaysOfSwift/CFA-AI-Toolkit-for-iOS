# Callback Networking

## Starting point

URLSession returns a decoded launch through a completion handler.

## Behaviour to preserve

Both implementations return Artemis on success and report HTTP 503 and malformed JSON as distinct errors.

## Migration

The provider asks `NetworkingManager` for data using URLSession’s async API. The wrapper has no mutable request state. Copies of the wrapper still refer to the same configured session. The provider validates and decodes each response with request-local values. The continuation is used only by the legacy behaviour check.

`Launch` is an immutable value with a `let` name. A Feature using this
provider can replace its published snapshot when a current response arrives.
The provider leaves that publication decision to the Feature. This example
exercises the transport and decoding boundary.

## Run and verify

Open and run `Before.playground` and `After.playground`. Each prints `Passed:` after its assertions succeed. In a toolkit source checkout, also run the automated check described in the parent README.

## Boundaries

A local URLProtocol is deterministic; cancellation, timeouts and retries are not demonstrated.
