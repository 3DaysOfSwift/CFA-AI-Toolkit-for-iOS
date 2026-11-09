# Callback Networking

## Starting point

URLSession returns a decoded launch through a completion handler.

## Behaviour to preserve

Both implementations return Artemis on success and report HTTP 503, malformed JSON and an offline transport failure as distinct errors.

## Migration

The provider asks `NetworkingManager` for data using URLSession’s async API. The wrapper has no mutable request state. Copies of the wrapper still refer to the same configured session. The provider validates and decodes each response with request-local values. The continuation is used only by the legacy behaviour check.

`Launch` is an immutable value with a `let` name. A Feature using this
provider can replace its published snapshot when a current response arrives.
The provider leaves that publication decision to the Feature. This example
exercises the transport and decoding boundary.

## Run and verify

Open and run `Before.playground` and `After.playground`. Each prints `Passed:` after its assertions succeed. In a toolkit source checkout, also run the automated check described in the parent README.

## Boundaries

The local URLProtocol exercises success and error handling with one request at
a time. For independent requests in a real migration, hold the first response
open in a controlled transport and verify that the second request reaches the
transport before the first completes. Preserve deliberate ordering and rate
limits. See the CFA independent-request rule (`CFA-SPEC-NET-01`). This fixture
does not exercise cancellation, timeouts or retries.
