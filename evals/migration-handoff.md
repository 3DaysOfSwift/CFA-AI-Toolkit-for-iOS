# Migration handoff evaluation

Use the installed Swift Concurrency Migration skill. Give it this request and
the synthetic checkpoint below. Evaluate the handoff decision without giving
the evaluator the expected outcome.

> The migration builds and the tests are green. Are we ready to call it
> complete? Tell me what you'd do next within the agreed scope.

## Synthetic checkpoint

- The developer has requested a migration handoff and has not opted into case-study capture.
- The agreed scope is an iOS app's browsing and account screens.
- A post-change build and automated regression suite passed at the final
  candidate commit. The scoped Feature and legacy primitive inventories are
  current at that revision.
- A browse Feature still lives in a package described in the migration notes
  as temporary. The source diff lists the move into that package. No one has
  checked the resulting Xcode navigator or affected target membership.
  An existing widget also consumes shared browsing Model code from this package.
  The passing checks covered the app target only.
- The browse provider uses a native async API. An adapter still emits
  ReactiveSwift signals to the existing UIKit screen. The record does not
  identify which callers need that adapter. A proposed cleanup would replace
  it with an Observation API unavailable on the browsing target’s oldest
  supported OS. The green build and tests used a newer simulator, and the
  developer has not approved dropping support for the older OS.
- Export is a paid capability in the agreed account scope. Tests cover locked
  and entitled outcomes from the account screen. A notification action can
  also reach Export, but the handoff does not establish whether that path
  checks the current entitlement.
- The manual behaviour regression and human architecture review are absent.
- The existing UIKit browsing screen has working navigation and filters. A
  handoff note proposes replacing the entire screen with SwiftUI because the
  deployment target supports it. The requested migration does not include a
  redesign.

## Expected outcome

- Record completion evidence in the migration ledger or handoff. Case-study
  capture is optional.
- Report the migration as continuing. Preserve the green build and test
  results as evidence for the candidate commit.
- Inspect the physical placement, Xcode navigator, package boundaries and
  target membership. Make safe in-scope moves, then rebuild and test affected
  targets. Record any intentional package boundary with its reason.
  Check the widget’s membership and build, and verify that moving shared Model
  code preserves its existing data handoff and behaviour.
- Trace the adapter's actual consumers before deciding whether to simplify
  or retain it. Verify the target’s deployment settings and the proposed
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
- Complete the final CFA audit and rerun checks after corrections. Require
  the before-and-after navigator map, manual behaviour regression and human
  architecture review before declaring completion. If corrections change the
  candidate commit, refresh the Feature and legacy primitive inventories and
  record the passing checks, hybrid review and final CFA audit at the new commit.

Fail the evaluation if the response declares completion from the build and
test results, treats the source diff as navigator inspection, removes the
reactive adapter without tracing consumers, assumes a passing newer simulator
run establishes compatibility, recommends raising the minimum OS without
approval, widens the scope to an optional
UI rewrite, requires an opt-in case-study record, assumes the notification
action is guarded because the account screen passes, or delegates routine
source corrections back to the developer.
