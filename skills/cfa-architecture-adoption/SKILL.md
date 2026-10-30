---
name: cfa-architecture-adoption
description: Adopt CFA in an existing iOS app or bring existing CFA features into alignment. Use for feature ownership and AppModel restructuring; not for GCD migration alone or read-only reviews.
---

# CFA Architecture Adoption

Read [project workflow and design authority](references/project-workflow.md) first.
Respect the recorded workflow and current request; new-app design defaults do
not authorize UI changes during maintenance or a narrowly scoped task.

When explaining a substantive finding or answering why a rule exists, use
[decision rationale and verified learning links](references/explanations/guide.md).
Read only the relevant topic note. Explain the consequence in the user's context;
do not impose CFA on another architecture or link to an unpublished article.

Apply the specification's screen-construction invariant within the requested
scope: private ViewModel ownership with inline `@State` construction by default.
A detail View may construct its own State-backed ViewModel from selected value data
in its initializer. Never inject or share ViewModels; keep selection out of Features. Review-only work
reports violations; tests inject Features into ViewModels, not ViewModels into Views.

Restructure an existing app around CFA while preserving its observable behaviour.

A flat `App.swift` or `ContentView` that mixes screen state, persistence, and
business work is not already CFA. Adopt real ownership boundaries before adding
folders; do not relabel a flat app as CFA.

Read [CFA specification](references/cfa-specification.md), [CFA change gate](references/cfa-change-gate.md), [reference feature](references/reference-feature.md) and [product behaviour contract](references/product-behaviour-contract.md).

1. Identify the live target, dependency wiring and baseline build/tests. Map current screens, business decisions, state owners and persistence. Record existing failures separately.
2. Define a bounded feature and its behaviour contract. Map each responsibility to its CFA destination before moving code. Inventory screens and tabs with their dedicated ViewModels and required concrete AppModel Features. A screen can present several independent business capabilities; several screens can use the same Feature. Identify missing business owners, not missing tab wrappers, and give actual Features named tests. Keep shared business state under one authoritative owner. Preserve public interfaces with temporary adapters where needed.
3. Separate screen presentation from feature rules. Introduce or align AppModel.shared as the composition root with only Feature properties and its launch guard; its explicit initializer receives Features, and its single `static live()` builds production dependencies. Move each authoritative value and its mutations to a named Feature. Route SwiftData through `SwiftDataManager`, networking through `NetworkingManager`, app-wide refresh through the earliest lifecycle callback, and screen-owned initial work through that screen's `.task` before it appears.
4. Migrate one end-to-end feature at a time, checking callers and live wiring. Keep data formats, navigation, errors, ordering and operation lifetimes stable. Remove superseded wiring only once all callers have moved.
5. Preserve the existing design, palettes, theme selector, Settings content and branding. Do not apply new-app design defaults or report their absence as adoption gaps. An explicitly requested visual change stays limited to that request; record it in the behaviour contract and verify saved preferences and affected interactions.
6. Build and run relevant regression checks at each meaningful boundary. Compare final ownership against the specification’s review checklist and explain any remaining transitional components.

Use this workflow for an architecture-only adoption when the application is
already modern or the developer has explicitly limited the scope to structure.
For a legacy GCD, OperationQueue or callback-based application, use **Legacy
GCD migration**: it establishes CFA ownership and migrates concurrency in
separate, verified feature checkpoints. Do not silently perform a whole-app
concurrency rewrite during a narrowly requested architecture-only adoption.

Deliver a before/after ownership map, behaviour evidence and any remaining migration ledger. Existing CFA feature enhancements may use the same rules at feature scope without restructuring the whole app.

## Preserve app branding

Do not add a CFA starter icon during ordinary maintenance. Preserve existing
artwork, variants and target identity. Repair icon wiring when it belongs to the
requested fix; use bundled starter artwork only on an explicit request.
Do not repeatedly offer branding changes or count their absence as CFA defects.

## Shared Swift coding standards

Read the [Swift coding guide](references/swift-coding-guide.md) before implementing or reviewing Swift. Apply its rules for crash safety, shared model decisions, declarative Views, KISS, errors, concurrency, responsiveness and verification within this workflow's authorized scope. Treat forced operations as explicit crash decisions; never infer permission to retain them merely because they appear safe. Read-only reviews report violations rather than editing code.
