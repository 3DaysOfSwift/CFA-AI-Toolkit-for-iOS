---
name: cfa-unit-tests
description: Write, organise and audit meaningful unit tests for CFA SwiftUI applications. Use when adding tests, reviewing test quality or restructuring a CFA test suite.
---

# CFA unit tests

Read the [CFA specification reading map](references/spec/README.md) to locate applicable topics. The complete CFA specification remains authoritative; use it for whole-app audits.

Read [project workflow and design authority](references/project-workflow.md) first.
Respect the recorded workflow and current request; new-app design defaults do
not authorize UI changes during maintenance or a narrowly scoped task.

When explaining a substantive finding or answering why a rule exists, use
[decision rationale and verified learning links](references/explanations/guide.md).
Read only the relevant topic note. Explain the consequence in the user's context;
do not impose CFA on another architecture or link to an unpublished article.

Apply the specification's screen-construction invariant within the requested
scope: a private `viewModel` property with inline `@State` construction by default.
A detail View may construct its own State-backed ViewModel from selected value data
in its initializer. Never inject or share ViewModels. Keep screen and scene
selection in presentation and follow the [detail snapshot lifetime rule](references/spec/rules/cfa-ui-03.md)
when the source data changes. Review-only work
reports violations; tests inject Features into ViewModels, not ViewModels into Views.

Read the [CFA specification](references/cfa-specification.md), [CFA change gate](references/cfa-change-gate.md), [product
behaviour contract](references/product-behaviour-contract.md) and [Swift coding
guide](references/swift-coding-guide.md). Keep production decisions in Features
and presentation state in ViewModels; never move a business rule into
a ViewModel merely to make it easier to test.

For a review-only request, inventory and report without editing. For a writing
request, first establish the current test result and map real behaviour to
tests. Do not create tests that only prove stored values can be read back from a
struct or that an object can be constructed.

Organise tests by owner. The [folder map](references/spec/topics/12-make-the-architecture-visible-in-the-folder-structure.md)
shows the core groups. Add the optional concurrency, persistence, integration
and support groups when their contents need a separate home:

```text
<App>Tests/
├── AppModel tests/
├── View model tests/     # one named file for each production ViewModel
├── FeatureTests/<Feature>/ # one <Feature>Tests.swift home per concrete Feature
├── ConcurrencyTests/<Feature>/  # optional cross-boundary scenarios
├── PersistenceTests/
├── IntegrationTests/
└── Support/
```

For each public Feature API operation and meaningful ViewModel behaviour,
consider applicable success, validation/boundary, failure/retry, duplicate,
cancellation and overlapping-operation scenarios. Assert observable results,
state transitions and side effects rather than private implementation details.
Await async Feature commands directly. Use injected repositories, clocks,
clients and controllable continuations to exercise stale results, actor
reentrancy and partial failure wherever they affect correctness. Avoid live
services, arbitrary sleeps and assumptions about task scheduling.

For retained ViewModel tasks, prove that repeated actions share one execution
only when the same result satisfies each action, including failure and retry.
Independently test each Feature's sharing or sequential-queue policy with multiple callers:
shareable requests receive the shared outcome; commands that must each take effect
execute in admission order and receive their own outcomes, even when their inputs
match. Cover cancellation, cleanup
and later work after failure without losing or indefinitely suspending waiters.

For paid capabilities, exercise locked and entitled outcomes at each relevant
entry point, including alternate screens or system actions that can invoke the
capability. Supply controlled entitlement state and verify that locked paths
show the expected purchase or locked experience where applicable and never
invoke the paid operation. Verify that entitled callers can proceed. Verify
server-side authorisation separately for server-protected operations.

For shared refreshes that should survive navigation, suspend the refresh and
cancel its only screen waiter. Verify that the Feature still completes and
retains the result. Test that cancelling one of several waiters leaves the
others able to finish. If a cancelled waiter must exit promptly, verify that
it returns before releasing the suspended refresh.

For detail screens that keep a selected snapshot, construct two independent
ViewModels with different snapshots and a shared Feature. Change the source
list, including omitting a selected item, and verify each ViewModel retains
its own display. If detail refresh is supported, check that it updates only
the intended destination. Use a UI or manual test to verify that both scenes
retain their navigation and that a source refresh does not dismiss either.

For deep links and notification actions, drive scene outcomes through a
controlled handler. Force the initial save to fail and verify that the caller
receives the error and the pending list does not publish an unsaved request.
Verify that refusal or cancellation before navigation
leaves the request pending and that navigation consumes it even if cancellation
follows. Simulate a failed removal after navigation, then retry the write and
verify that the handler is called only once. Exercise competing scenes and
an open racing an explicit dismissal of the same request. Assert the outcomes
against the pending list and the scene’s navigation state. Verify restoration
without losing unrelated pending requests.

For apps that exchange snapshots with a widget or another device target, apply
the [multi-device rule](references/spec/rules/cfa-device-01.md). With controlled
storage and a reload spy, verify that a successful widget snapshot write
precedes the reload request and a failed write issues no reload request.
For a receiving Feature, exercise missing, unreadable, delayed and stale
snapshots according to the product's rules. Verify real WidgetKit or Watch
Connectivity handoff separately on supported devices.

For account changes, hold an old account's request open, switch accounts or
sign out, then complete the old request. Verify that its data is never
published into the new session. Exercise successful cleanup, sign-out
failure before the session ends, and partial authentication or cleanup
failure where supported. Assert the actual session and retained or deleted
data against the product's sign-out contract.

When independent network requests should overlap, hold the first response
open in a controlled transport. Verify that the second request reaches
the transport before releasing the first. Test any intentional request
limit separately.

For durable edits, hold the write open and verify that confirmed state stays
unchanged until it succeeds. On failure, assert that the editor keeps its
draft and can retry. For optional download caches, independently control disk
and network completion. Verify that a slow restore leaves refresh free to
start, a late restore cannot replace fresh data, and a pending or failed cache
write leaves the refresh result usable. When replacing a usable cache fails,
reopen the cache to verify the previous snapshot survives, and verify that
any offline availability indicator refers only to saved data. Check that a
failed refresh retains valid displayed data and that delayed cache writes
cannot replace a newer snapshot.

For restored preferences, check that a supported saved value is restored and
that a missing or obsolete non-critical value uses the product-defined
fallback. Where the old value should be retained, verify that restoration
leaves it in storage. Exercise unreadable or corrupt durable storage and
failed writes separately, and verify that the Feature reports the error
without publishing a successful save.

Build AppModel tests from an isolated dependency graph. Do not call production
`AppModel.shared` from a unit test. When AppModel owns app-wide listeners,
supply a controlled event source and observe the receiving Feature. Verify
repeated startup signals start each listener once and that events reach the
Feature without a screen. Where cancellation or replacement is supported,
exercise it and shut down isolated listeners during test cleanup.

For system background work, use a controlled scheduler to verify that launch
registers each applicable handler once and that scheduling happens separately.
Drive the handler through success, failure and expiration. Verify that the
owning Feature handles cancellation and completes the system callback once.
Confirm actual background execution on a supported device.

Give each production ViewModel a matching
test file and test what its View can observe: loading/ready/error states,
actions, drafts, selection and asynchronous results.
Give each concrete Feature a matching API test file under `FeatureTests`,
including `SettingsFeatureTests.swift` in a new app. Name feature owners and
their test files with `Feature`, never the obsolete `Manager` suffix. A real
infrastructure or presentation manager such as `ThemeManager` may retain its
name and have its own tests.

When auditing quality, report separately:

- executed passed, failed, skipped and unexecuted test counts;
- behaviour/scenario coverage, distinct from line coverage;
- tests with no meaningful asserted behaviour; and
- named missing scenarios, with source evidence and why they matter.

Run focused tests and then the appropriate full suite. State target, simulator
or device, runner result and any unavailable validation honestly. Green tests
do not prove exhaustive coverage or race freedom.
