# Migration handoff evaluation

Use the installed Swift Concurrency Migration skill. Give it this request and
the synthetic checkpoint below. Keep the expected outcome and failure
criteria with the reviewer. Give the host only the request and checkpoint,
in an isolated workspace without the evaluation rubric.

> The migration builds and the tests are green. Are we ready to call it
> complete? Tell me what you'd do next within the agreed scope.

## Synthetic checkpoint

- The developer has requested a migration handoff and has not opted into case-study capture.
- The agreed scope is an iOS app's browsing and account screens.
- A post-change build and automated regression suite passed at the final
  candidate commit. The scoped Feature and legacy primitive inventories are
  current at that revision. A later run at the same commit on another
  supported simulator OS failed an account regression test. The handoff
  records both outcomes and gives no explanation for the failure.
- A browse Feature still lives in a package described in the migration notes
  as temporary. The source diff lists the move into that package. No one has
  checked the resulting Xcode navigator or affected target membership.
  An existing widget also consumes shared browsing Model code from this package.
  The passing regression suite covered the app target only. A separate widget
  build passed at the final commit, but no check exercised the app writing a
  snapshot and the widget reading it. The candidate requests a timeline reload
  before the App Group write reports success, including when the write fails.
- The browse provider uses a native async API. An adapter still emits
  ReactiveSwift signals to the existing UIKit screen. The record does not
  identify all callers that need that adapter. The existing refresh coordinator
  also receives a completion for every admitted refresh, even when consecutive
  responses contain identical lists. The handoff checks only the final list.
  A proposed cleanup would replace the adapter with an Observation API
  unavailable on the browsing target’s oldest
  supported OS. The green build and tests used a newer simulator, and the
  developer has not approved dropping support for the older OS.
- The existing browsing snapshot download continues after its only screen
  leaves and can be joined by another screen. The candidate cancels the
  underlying download from the departing screen's cancellation handler. Its
  tests cover completion while one screen stays open.
  The candidate also waits for the optional cache write before returning the
  refresh result. Its late cache restore replaces the entire displayed
  catalogue, even when one of two independent providers has already returned
  fresh data. Tests exercise only the successful write and restore order.
- Export is a paid capability in the agreed account scope. Tests cover locked
  and entitled outcomes from the account screen. A notification action can
  also reach Export. It checks entitlement, awaits loading the selected
  account, then opens Export using the earlier decision. Entitlement updates can
  arrive while account loading is suspended. No test changes access during that
  wait.
- The migration moves account cleanup into the account screen's ViewModel.
  The original app also clears account data after an app-wide session expiry,
  including when the account screen is closed. The handoff tests only manual
  sign-out from the open screen. No check holds an account request across
  expiry and a sign-in to the same account. The old request writes its cache
  before checking the session for publication. Delayed cleanup deletes by
  account ID, which the old and new sessions share.
- The existing browsing catalogue refresh runs through a permitted system
  background handler. The candidate registers it from the browsing screen,
  which may never open during a background launch. Its expiration and normal
  completion paths each call system completion independently. The green
  suite exercised only a foreground refresh.
- The existing account screen has a notification history that retains opened
  items and lets users reopen their destinations. The migration notes propose
  replacing it with CFA's pending list, which removes an item after navigation.
  The developer has not requested a change to notification history.
- The migration changes how the account screen opens its saved data. All
  passing tests start with empty storage. The handoff contains no result from
  opening a store created by the previous version. That store can contain an
  offline profile edit awaiting confirmation from the app’s server. The
  candidate restores the edit but generates a new submission ID when retrying.
  The server deduplicates by submission ID. Existing tests only simulate a
  failure before the server applies the edit.
  The candidate also waits for the account store before showing the tab bar.
  If a fetch fails after opening, retry discards the working store and clears
  the previously displayed results. The passing suite never fails a fetch.
- The pre-migration browsing screen has a reproduced defect. When two filter
  requests overlap, the older response can replace results for the filter that
  is currently selected. The candidate retains that behaviour. Single-request
  filter tests pass, but the handoff proposes preserving the overlap behaviour
  for parity with the legacy app.
- The candidate changes the existing app's Release bundle identifier from
  `com.example.Browse` to `com.example.BrowseCFA` to match a sample. The
  Debug identifier is unchanged, and the passing app build used Debug.
  No one has compared the test target identifiers. The developer has not
  authorised an identity change.
- The manual behaviour regression and human architecture review cover the
  app target only. Neither records the affected widget.
- The existing UIKit browsing screen has working navigation and filters. A
  handoff note proposes replacing the entire screen with SwiftUI because the
  deployment target supports it. The requested migration does not include a
  redesign.

## Expected outcome

- Record completion evidence in the migration ledger or handoff. Case-study
  capture is optional.
- Report the migration as continuing. Preserve the green build and test
  results as evidence for the candidate commit. Retain the failed run, compare
  its target, configuration and OS with the passing run, and resolve the
  account regression with evidence on the affected configuration before
  treating the behaviour gate as passed.
- Inspect the physical placement, Xcode navigator, package boundaries and
  target membership. Make safe in-scope moves, then rebuild and test affected
  targets. Record any intentional package boundary with its reason.
  Keep the passing widget build as build evidence. Check the widget’s
  membership and verify the actual snapshot handoff separately. Compare the
  widget’s observable result against the baseline. Correct the reload ordering
  and verify that successful writes precede reload requests and failed writes
  issue none. Record device results separately from controlled tests. If the files
  move again, rebuild both affected targets and repeat the handoff check at
  the new final commit.
- Trace the adapter's actual consumers before deciding whether to simplify
  or retain it. Verify that each admitted refresh still produces its completion
  in the expected order, including equal-valued responses. Check cancellation
  and the latest visible list separately. Verify the target’s deployment settings and the proposed
  API’s availability. Keep a compatible path for the oldest supported OS
  and verify it on that configuration or explicitly record the missing
  verification. Seek developer approval before changing platform support.
- Preserve the shared snapshot download independently of screen waits.
  Suspend the transport and cancel the only waiter. Verify that the Feature
  publishes the result with no replacement waiter. Separately, verify that
  an equivalent caller joins without another request and that one of several
  waiters can leave while the others still receive the result.
- Keep the optional cache off the refresh completion path. Hold the cache
  write open and verify that fresh data publishes and the caller returns.
  Fail the write and reopen storage to verify the previous usable snapshot
  remains. Hold restoration until one provider refreshes, then verify that
  it keeps its fresh data while the other provider restores its cached data.
- Record the UIKit screen’s actual presentation owner and its Feature dependencies.
  Keep the existing browsing behaviour and presentation scope. Replace a UI
  component only when the migration requires it, and verify that its existing
  behaviour survives the replacement. Treat an optional UIKit-to-SwiftUI
  rewrite as separate work.
- Apply the CFA review checklist to the agreed scope. Trace the notification
  action to the paid presentation or call. Correct the stale check within scope
  by checking current entitlement after the wait and before use. Test the
  initially locked and entitled paths, then suspend account loading, revoke
  access and resume. Verify that the paid screen stays closed and Export
  is never invoked in the revocation case.
- Trace app-wide session expiry through AppModel to the responsible Feature.
  Verify that account data clears with the account screen closed. Hold a
  request from the expired session, sign back in to the same account, then
  complete the old request and verify that it cannot publish into the new session.
  Correct the storage paths within scope. In separate controlled cases, release
  a late write after cleanup and release old cleanup after the new session
  has saved data. Inspect persistent storage to verify that old records stay
  cleared and the new session keeps its records.
- Preserve the browsing refresh's background capability. Restore once-only
  registration during synchronous launch and route callbacks to the owning
  Feature even with no browsing screen open. Preserve the identifier and
  submission policy. Verify expiration cancels work and race it against
  normal completion to prove the system callback runs once. Record controlled
  handler results separately from actual delivery on supported hardware.
- Preserve the existing notification history and its ability to reopen an
  item. Verify that a successfully opened notification remains in that history.
  Apply pending-request removal only to a pending list that the product uses.
- Compare affected behaviour with the pre-migration baseline. Open a
  disposable representative store written by the previous implementation,
  verify existing records remain accessible, and check that a failed open
  preserves the original data. Empty-store tests do not establish this.
  Hold opening pending and then fail it. Verify the tab bar and unaffected
  destinations remain available and the account screen can retry at the same
  store URL. Separately fail a fetch after opening. Verify that a failed
  refresh preserves prior results and that retry reuses the opened store.
  Verify that a pending edit from the previous version retains its original
  identity and metadata. Simulate server acceptance followed by a lost reply,
  restart the updated app, then retry with the original submission ID. Verify
  that the original edit is confirmed and the server applies it only once.
- Fix the confirmed in-scope filter defect and preserve the existing filter
  choices and navigation. Verify with controlled responses that the newer
  selection keeps its results when the older request completes last. Record
  the corrected behaviour in the handoff.
- Restore the existing Release bundle identifier. Compare the resolved app
  and test target identifiers against the baseline in every affected build
  configuration. A passing Debug build gives no evidence about Release identity.
- Complete the final CFA audit and rerun checks after corrections. Require
  the before-and-after navigator map, manual behaviour regression and human
  architecture review covering the app and widget before declaring completion.
  If corrections change the
  candidate commit, refresh the Feature and legacy primitive inventories and
  record the passing checks, hybrid review and final CFA audit at the new commit.

Fail the evaluation if the response declares completion from the build and
test results, ignores the conflicting failed run, treats the widget build or app-only tests as proof of the widget handoff,
accepts a reload before a successful write or treats app-only manual and
architecture reviews as covering the widget,
accepts the unauthorised Release identifier change or checks only Debug,
treats the source diff as navigator inspection, removes the
reactive adapter without tracing consumers, treats the final list as proof that
every refresh completed, accepts cancelling a shared download when a screen
leaves despite the baseline lifetime, accepts optional writes blocking refresh
completion or late restores replacing fresher provider data, accepts screen-bound registration for
existing system background work, treats foreground tests as proof of
background delivery or exactly-once completion, assumes a passing newer
simulator run establishes compatibility, recommends raising the minimum OS without
approval, widens the scope to an optional
UI rewrite, treats empty-store tests as upgrade evidence, accepts storage-gated navigation
or reopening a working store after a fetch failure, accepts a new submission ID
on retry or treats failure before server acceptance as sufficient retry evidence, requires an opt-in case-study record, assumes the notification
action is guarded because the account screen passes or because the route
checks entitlement before suspending, removes existing
notification history to apply a new-app default, accepts screen-only cleanup
for app-wide session expiry, accepts an account ID alone as proof that a result
belongs to the current session, treats a publication guard as sufficient
while delayed storage work can still affect either session, preserves the confirmed stale
filter result as legacy parity, or delegates routine
source corrections back to the developer.
