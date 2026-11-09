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
A detail View may construct its own State-backed ViewModel from a selected immutable snapshot
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
When a replacement can start before the previous task exits, hold the previous
task open, start the replacement, then finish the previous task. Verify its
result and cleanup leave the replacement's state and handle intact.

For paid capabilities, apply the
[paid capability rule](references/spec/rules/cfa-pay-01.md). Exercise locked
and entitled outcomes at each relevant entry point, including alternate
screens and system actions. Supply controlled entitlement state. Verify that
locked paths withhold paid content and controls, show the expected purchase
or locked experience where applicable, and never invoke the paid operation.
Verify that entitled callers can proceed. If
entitlement can change while the screen stays open, change it after initial
presentation and verify that a later action checks the current value. If access
can change between a check and its use, suspend the route after its first check,
revoke access, then resume it. Verify that it neither presents paid content nor
invokes the paid operation. Verify server-side authorisation separately for
server-protected operations.

For shared refreshes that should survive navigation, suspend the request and
cancel its only screen waiter. Release the request with no replacement waiter
and verify that the Feature retains the result. In a separate test, admit a
later equivalent caller while the request is suspended and verify it receives
the same outcome without starting a second request. Also test that cancelling
one of several waiters leaves the others able to finish. If a cancelled waiter
must exit promptly, verify that it returns before releasing the request.

For detail screens that keep a selected snapshot, construct two independent
ViewModels with different snapshots and a shared Feature. Change the source
list, including omitting a selected item, and verify each ViewModel retains
its own display. If detail refresh is supported, check that it updates only
the intended destination. Use a UI or manual test to verify that both scenes
retain their navigation and that a source refresh does not dismiss either.

For deep links and notification actions, apply the
[deep-link rule](references/spec/rules/cfa-link-01.md). Verify that URL opens
and user actions on local and push notifications reach the same Feature.
Scheduling or delivery alone must leave the pending list unchanged. Exercise
repeated callbacks for the same opening event and separate events targeting
the same destination. Verify that only the repeated callback is deduplicated.
Drive scene outcomes through a controlled handler. Exercise invalid input
before navigation and verify that the pending list and its stored snapshot
remain intact. Force the initial save to fail and verify that the caller
receives the error and the pending list does not publish an unsaved request.
With an unreadable saved list, verify the read error reaches the caller and
the original bytes are preserved. After restoring readable data, retry the
request and reopen the store to verify both entries survive.
Verify that refusal or cancellation before navigation
leaves the request pending and that navigation consumes it even if cancellation
follows. Simulate a failed removal after navigation, then retry the write and
verify that the handler is called only once. Separately, fail the write for
an explicit dismissal. Verify that the error reaches the caller, the request
stays pending, and reopening the store after retry shows it was removed.
Exercise competing scenes and an open racing an explicit dismissal of the same request. Assert the outcomes
against the pending list and both scenes’ navigation state. While one scene
is deciding, open a different pending request in another scene and verify
that the first request stays pending. Suspend restoration,
receive a new request, then finish restoring an older pending list. Reopen
from storage and verify that both the restored and new requests survived. In
a separate case, open a request while an older restoration result is held.
Release the result and verify that the opened item stays removed and the
other requests remain available, including after reopening the store.

For apps that exchange snapshots with a widget or another device target, apply
the [multi-device rule](references/spec/rules/cfa-device-01.md). With controlled
storage and a reload spy, verify that a successful widget snapshot write
precedes the reload request and a failed write issues no reload request.
For a receiving Feature, exercise missing, unreadable, delayed and stale
snapshots according to the product's rules. Verify real WidgetKit or Watch
Connectivity handoff separately on supported devices.

For account changes, hold an old account's request open, switch accounts or
sign out, then complete the old request. Verify that its data is never
published after sign-out or into the new session. Where the same account can
sign in again before its earlier request completes, test that sequence too.
For account-scoped storage, verify a late write cannot recreate cleared data
and delayed cleanup cannot delete new-session data. Inspect persisted records
after releasing the delayed work, as well as the Feature's visible state.
If a session can expire externally, drive that event while account work is
pending and verify the Feature reconciles the session and rejects the old result.
Exercise successful cleanup, sign-out
failure before the session ends, and partial authentication or cleanup
failure where supported. Assert the actual session and retained or deleted
data against the product's sign-out contract.

When independent network requests should overlap, hold the first response
open in a controlled transport. Verify that the second request reaches
the transport before releasing the first. Test any intentional request
limit separately.

For apps that use a database, apply the
[database availability rule](references/spec/rules/cfa-launch-02.md). Hold
initial store opening in a controlled dependency, then fail it. Verify that
the affected Feature exposes a recoverable failure and can retry. Verify
that the screen ViewModel exposes the corresponding error text and clears
it on successful recovery. In a separate case, fail a fetch after opening
the store. Verify that retry reuses the opened store, a failed initial fetch
shows an error, and a failed refresh retains prior results. Exercise launch and navigation while storage is slow or unavailable. Verify
that the root appears and unaffected destinations remain accessible.
For file-backed storage, use a disposable configured store URL. Verify that
first use creates missing parent directories and overlapping first requests
share the opened store. Block directory creation with a file, verify that the
request fails and leaves that file intact, then remove the test obstruction
and retry at the same URL. Save and reopen the store to verify persistence.

For durable edits, hold the write open and verify that confirmed state stays
unchanged until it succeeds. On failure, assert that the editor keeps its
draft and can retry. Separately, cancel an unsaved edit and verify that the
draft is discarded without changing the stored or confirmed values.
For optional download caches, independently control disk
and network completion. Verify that a slow restore leaves refresh free to
start and a late restore cannot replace fresh data. For independent sources,
refresh one before restoration finishes. Verify that its fresh data survives
and that a different source can still restore its cached data. Hold a cache write pending
and verify both publication and caller completion before releasing it. Verify
that a failed write leaves the refresh result usable and retries stop within
the configured limit. When replacing a usable cache fails, reopen the cache
to verify the previous snapshot survives, and verify that
any offline availability indicator refers only to saved data. Check that a
failed refresh retains valid displayed data and that delayed cache writes
cannot replace a newer snapshot.

For refreshable Feature data, start with a confirmed value and hold the next
request open. Assert that the confirmed value remains available while the
Feature reports the operation in progress. Fail the request and verify that
the Feature retains the value, ends the operation and exposes the failure
independently.

For offline edits sent to a custom server, apply the
[sync rule](references/spec/rules/cfa-sync-01.md). Fail the local write and
verify that neither local success nor a sendable pending edit is published.
After a successful local write, fail sync, reconstruct the Feature from
storage, and verify that the edit and its pending metadata survive together.
Retry with the same edit identity and verify that it produces one logical
server change. Separately, let the server fixture apply the edit and drop its
reply. Reconstruct the Feature and verify that retry confirms the same edit
without applying it again. Exercise the product's conflict and rejection outcomes and
verify that server confirmation is shown only after acceptance. For
Apple-managed sync, verify the actual handoff and conflicting offline edits
on supported devices separately from the unit tests.

For durable storage compatibility, use a disposable representative store
written by the previous implementation with synthetic records. Verify that the changed implementation
opens it at the intended location and can reopen the saved records. Exercise
a failed open or upgrade and confirm that it preserves the existing data.
Keep these storage checks separate from tests that start with an empty store.

For restored preferences, check that a supported saved value is restored and
that a missing or obsolete non-critical value uses the product-defined
fallback. Where the old value should be retained, verify that restoration
leaves it in storage. Exercise unreadable or corrupt durable storage and
failed writes separately, and verify that the Feature reports the error
without publishing a successful save.

For simple preferences backed by `UserDefaults`, use isolated defaults and
verify that the value is updated before the Feature publishes it. A read-back
in the same process verifies the in-memory value. If the product requires
confirmed disk writes, test success and failure through the storage API that
reports that outcome.

Build AppModel tests from an isolated dependency graph. Do not call production
`AppModel.shared` from a unit test. When startup changes, apply the
[synchronous launch rule](references/spec/rules/cfa-launch-01.md). Signal
launch twice with controlled Feature dependencies. Verify the first call
initiates the required work while disk or network responses remain held, and
that the second call starts no duplicate work. Trace delegate wiring and
measure first-frame timing separately from this AppModel test.
If launch and screen refresh can overlap, hold the launch-started request
open and request the same data from the screen. Under CFA’s default policy,
verify that the screen receives the shared result and that only one request
reaches the service. Exercise failure and verify a subsequent retry can start.

When AppModel owns app-wide listeners,
supply a controlled event source and observe the receiving Feature. Verify
repeated startup signals start each listener once and that events reach the
Feature without a screen. Where cancellation or replacement is supported,
verify that the old listener stops forwarding and its cleanup leaves the
replacement running. Shut down isolated listeners during test cleanup.

For a changed observer-backed stream that supports resubscription, hold the
old registration's teardown pending and register its replacement. Deliver a
late event from the old source, then release the old teardown. Verify that
the late event cannot update the new consumer and that the replacement still
receives its own events. Control teardown explicitly instead of using sleeps.

For system background work, use a controlled scheduler to verify that launch
registers each applicable handler once and that scheduling happens separately.
Drive the handler through success, failure and expiration. Verify that the
owning Feature cancels the work on expiration. Hold the work at completion
and deliver expiration before releasing it. Verify that the race still
completes the system callback exactly once. Confirm actual background
execution on a supported device separately from the controlled tests.

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
