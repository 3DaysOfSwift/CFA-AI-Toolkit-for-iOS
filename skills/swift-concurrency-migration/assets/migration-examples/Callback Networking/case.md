# Callback Networking

## Starting point

URLSession returns a decoded launch through a completion handler.

## Behaviour to preserve

Both implementations return Artemis on success and report HTTP 503, malformed JSON and an offline transport failure as distinct errors.

## Migration

The provider asks `NetworkingManager` for data using URLSession’s async API. The wrapper has no mutable request state. Copies of the wrapper still refer to the same configured session. The provider validates each response, decodes it into a private response type and returns an immutable domain value. A change to the provider’s wire format can be handled inside the adapter while preserving the Feature’s domain contract. The continuation is used only by the legacy behaviour check.

`Launch` is an immutable value with a `let` name. A Feature using this
provider can replace its published snapshot when a current response arrives.
The provider leaves that publication decision to the Feature. This example
exercises the transport and decoding boundary.

## Run and verify

Open and run `Before.playground` and `After.playground`. Each prints `Passed:` after its assertions succeed. In a toolkit source checkout, also run the automated check described in the parent README.

## Boundaries

The playground’s URLProtocol exercises success and error handling with one
request at a time. The automated check runs the same provider and
NetworkingManager with a controlled transport. It holds the first request open,
verifies an independent request completes, then cancels the held request and
checks that the caller receives a cancellation error. Real transport timing,
timeouts and retries are outside the example’s scope. Preserve deliberate
ordering and rate limits when applying CFA-SPEC-NET-01.
