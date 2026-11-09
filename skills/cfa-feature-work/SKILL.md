---
name: cfa-feature-work
description: Add, change or remove a feature in an existing CFA SwiftUI iOS app. Use for feature work in a CFA project. In another architecture, preserve its existing boundaries unless the developer requests CFA adoption or migration.
---

# CFA feature work

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
in its initializer. Never inject or share ViewModels; keep screen and scene navigation selections
out of Features. Review-only work
reports violations; tests inject Features into ViewModels, not ViewModels into Views.

Read the [CFA specification](references/cfa-specification.md), [CFA change
gate](references/cfa-change-gate.md), [reference feature](references/reference-feature.md) and [product behaviour
contract](references/product-behaviour-contract.md) before editing.

First identify the live target, AppModel composition, existing feature owner,
affected Views/ViewModels, storage and tests. Record the intended user journey,
success/failure states and existing behaviour that must remain intact.

If the change introduces or touches a paid capability, establish its access
policy from the product requirements. The screen ViewModel reads current
entitlement from PurchasesFeature before presenting or invoking the capability.
Trace other entry points to their own checks and test both locked and entitled
behaviour. Keep pricing decisions separate from the capability's implementation.
Server operations enforce their own access policy.

Fit new UI into the existing product design. Do not add themes, footers or
branding merely because a new Feature is being created. In new-product
development, App Creation guides product shaping without expanding this task.

If the project is already CFA, make the smallest complete vertical change:

1. Add or change the feature-owned domain behaviour in its Feature and
   repository boundary. Keep unsaved editor values in the screen ViewModel.
   Publish a durable edit as saved only after required persistence succeeds.
   On failure, keep the draft available for retry and leave confirmed state
   unchanged. For a replaceable download, publish current server data and let
   optional caching finish independently.
2. Give every new screen-level SwiftUI View its own adjacent, bespoke ViewModel.
   Reusable presentation components may take snapshots, bindings and action
   closures. Use those closures to forward intent to the owning screen's
   ViewModel. Keep service calls and business decisions in the model.
3. Wire dependencies through AppModel. Do not create global singletons or add
   generic manager layers.
4. For a removal request, establish whether it removes a screen, an operation
   or the whole Feature. Trace remaining callers across screens, targets and system entry
   points. Remove only the routes, Views, ViewModels, APIs, tests and Xcode
   memberships that belong exclusively to the removed scope. Keep shared
   capabilities and the tests that cover their remaining callers. Remove stored
   data only when its retention requirements permit it.
5. Give each new ViewModel and concrete Feature its own named test file and
   suite. For existing types, extend their suites to cover changed observable
   behaviour at the owning boundary. A new screen using an existing Feature
   needs its own ViewModel tests and can reuse that Feature’s API tests.
   Build the target and run the affected suites.

If the project is not CFA, do not silently distribute CFA types throughout an
unrelated architecture. An explicitly requested isolated fix stays within
the existing architecture. If the developer requests CFA, use Architecture
Adoption for structural work and Swift Concurrency Migration when the scope
includes replacing legacy concurrency. Keep that decision separate from the
original feature request.

Deliver the changed user journey, ownership map and executed verification. Keep
the change small, readable and reversible; do not refactor unrelated features.

## Shared Swift coding standards

Read the [Swift coding guide](references/swift-coding-guide.md) before
implementing or reviewing Swift. Apply its rules for crash safety, shared model
decisions, declarative Views, KISS, errors, concurrency, responsiveness and
verification within this workflow's authorized scope.
