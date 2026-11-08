## Test the Same Boundaries the Architecture Advertises

The test navigator includes these primary groups:

```text
View model tests
AppModel tests
Feature tests
```

Add persistence, integration, concurrency and support groups when the project
needs them; keep the named Feature and ViewModel test homes easy to find.

Rules for tests:

- every ViewModel has its own test file and suite;
- every concrete Feature has a named API test file under `FeatureTests`,
  including `SettingsFeatureTests.swift` in a new app;
- never create one shared test suite for several screen ViewModels;
- ViewModel tests inject an isolated feature capability;
- feature tests exercise business rules and workflow coordination;
- repository tests exercise persistence, synchronization, and failure behaviour;
- AppModel tests verify construction and application-wide coordination;
- async functions are awaited directly in unit tests;
- task cancellation and race-prevention behaviour receive dedicated tests;
- repeated actions and Feature calls share execution and completion when one
  execution satisfies them all; commands that must each take effect run in
  admission order with individual outcomes, even when their inputs match.
  Cover failure/cancellation cleanup and successful later retry;
- clocks, repositories, and external clients use deterministic test doubles;
- tests describe observable behaviour, not private implementation details.
- tests that need AppModel assemble an isolated graph and never alter the shared
  production instance;
- concurrency tests cover cancellation, stale-result prevention, reentrancy,
  and partial failure where those behaviours affect correctness.

Do not use UI tests as compensation for async work hidden inside untestable
ViewModel-owned Tasks. Keep feature commands async and directly awaitable.

