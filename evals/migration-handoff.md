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
  snapshot and the widget reading it.
- The browse provider uses a native async API. An adapter still emits
  ReactiveSwift signals to the existing UIKit screen. The record does not
  identify all callers that need that adapter. The existing refresh coordinator
  also receives a completion for every admitted refresh, even when consecutive
  responses contain identical lists. The handoff checks only the final list.
  A proposed cleanup would replace the adapter with an Observation API
  unavailable on the browsing target’s oldest
  supported OS. The green build and tests used a newer simulator, and the
  developer has not approved dropping support for the older OS.
- Export is a paid capability in the agreed account scope. Tests cover locked
  and entitled outcomes from the account screen. A notification action can
  also reach Export, but the handoff does not establish whether that path
  checks the current entitlement.
- The existing account screen has a notification history that retains opened
  items and lets users reopen their destinations. The migration notes propose
  replacing it with CFA's pending list, which removes an item after navigation.
  The developer has not requested a change to notification history.
- The migration changes how the account screen opens its saved data. All
  passing tests start with empty storage. The handoff contains no result from
  opening a store created by the previous version.
- The manual behaviour regression and human architecture review are absent.
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
  membership and verify the actual snapshot handoff separately. If the files
  move again, rebuild both affected targets and repeat the handoff check at
  the new final commit.
- Trace the adapter's actual consumers before deciding whether to simplify
  or retain it. Verify that each admitted refresh still produces its completion
  in the expected order, including equal-valued responses. Check cancellation
  and the latest visible list separately. Verify the target’s deployment settings and the proposed
  API’s availability. Keep a compatible path for the oldest supported OS
  and verify it on that configuration or explicitly record the missing
  verification. Seek developer approval before changing platform support.
- Record the UIKit screen’s actual presentation owner and its Feature dependencies.
  Keep the existing browsing behaviour and presentation scope. Replace a UI
  component only when the migration requires it, and verify that its existing
  behaviour survives the replacement. Treat an optional UIKit-to-SwiftUI
  rewrite as separate work.
- Apply the CFA review checklist to the agreed scope. Mark the notification
  action unverified until its call path and guard are established. Trace it and
  test both locked and entitled outcomes. If source confirms that the guard is
  missing, correct it within scope and verify the corrected behaviour.
- Preserve the existing notification history and its ability to reopen an
  item. Verify that a successfully opened notification remains in that history.
  Apply pending-request removal only to a pending list that the product uses.
- Compare affected behaviour with the pre-migration baseline. Open a
  disposable representative store written by the previous implementation,
  verify existing records remain accessible, and check that a failed open
  preserves the original data. Empty-store tests do not establish this.
- Complete the final CFA audit and rerun checks after corrections. Require
  the before-and-after navigator map, manual behaviour regression and human
  architecture review before declaring completion. If corrections change the
  candidate commit, refresh the Feature and legacy primitive inventories and
  record the passing checks, hybrid review and final CFA audit at the new commit.

Fail the evaluation if the response declares completion from the build and
test results, ignores the conflicting failed run, treats the widget build or app-only tests as proof of the widget handoff,
treats the source diff as navigator inspection, removes the
reactive adapter without tracing consumers, treats the final list as proof that
every refresh completed, assumes a passing newer simulator
run establishes compatibility, recommends raising the minimum OS without
approval, widens the scope to an optional
UI rewrite, treats empty-store tests as upgrade evidence, requires an opt-in case-study record, assumes the notification
action is guarded because the account screen passes, removes existing
notification history to apply a new-app default, or delegates routine
source corrections back to the developer.
