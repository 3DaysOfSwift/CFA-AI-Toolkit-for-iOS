---
name: cfa-feature-work
description: Add, change or remove a feature in an existing CFA SwiftUI iOS app. Use for feature work in a CFA project; when the app is not CFA, ask whether the developer wants Legacy GCD migration before introducing CFA structure.
---

# CFA feature work

Read [project workflow and design authority](references/project-workflow.md) first.
Respect the recorded workflow and current request; new-app design defaults do
not authorize UI changes during maintenance or a narrowly scoped task.

Read the [CFA specification](references/cfa-specification.md), [CFA change
gate](references/cfa-change-gate.md), [reference feature](references/reference-feature.md) and [product behaviour
contract](references/product-behaviour-contract.md) before editing.

First identify the live target, AppModel composition, existing feature owner,
affected Views/ViewModels, storage and tests. Record the intended user journey,
success/failure states and existing behaviour that must remain intact.

Fit new UI into the existing product design. Do not add themes, footers or
branding merely because a new Feature is being created. In new-product
development, App Creation guides product shaping without expanding this task.

If the project is already CFA, make the smallest complete vertical change:

1. Add or change the feature-owned domain behaviour in its Feature and
   repository boundary.
2. Give every new SwiftUI View its own adjacent, bespoke ViewModel. Views remain
   declarative and forward intent; business decisions stay in the feature model.
3. Wire dependencies through AppModel. Do not create global singletons or add
   generic manager layers.
4. For a removal, delete the route, View, ViewModel, feature API surface,
   feature behaviour, storage only when its data-retention requirement permits,
   tests and Xcode membership together. Search all callers before deleting.
5. Add or revise meaningful feature and ViewModel tests, build the target and
   run the affected test suite.

If the project is not CFA, do not silently distribute CFA types throughout an
unrelated architecture. Explain that CFA feature work needs an owned AppModel,
feature boundary and ViewModel pairing, then ask whether the developer wants a
Legacy GCD migration / CFA migration first. A small explicitly requested
isolated fix remains within its requested architecture.

Deliver the changed user journey, ownership map and executed verification. Keep
the change small, readable and reversible; do not refactor unrelated features.

## Shared Swift coding standards

Read the [Swift coding guide](references/swift-coding-guide.md) before
implementing or reviewing Swift. Apply its rules for crash safety, shared model
decisions, declarative Views, KISS, errors, concurrency, responsiveness and
verification within this workflow's authorized scope.
