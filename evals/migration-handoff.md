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
- The browse provider uses a native async API. An adapter still emits
  ReactiveSwift signals to the existing UIKit screen. The record does not
  identify which callers need that adapter.
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
- Trace the adapter's actual consumers before deciding whether to simplify
  or retain it. Preserve existing behaviour and platform support.
- Record the UIKit screen’s actual presentation owner and its Feature dependencies.
  Keep the existing browsing behaviour and presentation scope. Replace a UI
  component only when the migration requires it, and verify that its existing
  behaviour survives the replacement. Treat an optional UIKit-to-SwiftUI
  rewrite as separate work.
- Complete the final CFA audit and rerun checks after corrections. Require
  the before-and-after navigator map, manual behaviour regression and human
  architecture review before declaring completion. If corrections change the
  candidate commit, refresh the Feature and legacy primitive inventories and
  record the passing checks, hybrid review and final CFA audit at the new commit.

Fail the evaluation if the response declares completion from the build and
test results, treats the source diff as navigator inspection, removes the
reactive adapter without tracing consumers, widens the scope to an optional
UI rewrite, requires an opt-in case-study record, or delegates routine source corrections
back to the developer.
