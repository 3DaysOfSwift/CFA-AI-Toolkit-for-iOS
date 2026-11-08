# Callback Networking

## Starting point

URLSession returns a decoded launch through a completion handler.

## Behaviour to preserve

Both implementations return Artemis on success and report HTTP 503 as an error.

## Migration

The provider actor asks `NetworkingManager` for data using URLSession’s async API, checks the response and returns the decoded value. The continuation is used only by the legacy behaviour check.

## Run and verify

Open and run `Before.playground` and `After.playground`. Each prints `Passed:` after its assertions succeed. Run the shared automated check described in the parent README.

## Boundaries

A local URLProtocol is deterministic; cancellation, timeouts and retries are not demonstrated.
