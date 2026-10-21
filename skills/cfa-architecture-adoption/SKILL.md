---
name: cfa-architecture-adoption
description: Adopt CFA in an existing iOS app or bring existing CFA features into alignment. Use for feature ownership and AppModel restructuring; not for GCD migration alone or read-only reviews.
---

# CFA Architecture Adoption

Restructure an existing app around CFA while preserving its observable behaviour.

A flat `App.swift` or `ContentView` that mixes screen state, persistence, and
business work is not already CFA. Adopt real ownership boundaries before adding
folders; do not relabel a flat app as CFA.

Read [CFA specification](references/cfa-specification.md), [CFA change gate](references/cfa-change-gate.md), [reference feature](references/reference-feature.md) and [product behaviour contract](references/product-behaviour-contract.md).

1. Identify the live target, dependency wiring and baseline build/tests. Map current screens, business decisions, state owners and persistence. Record existing failures separately.
2. Define a bounded feature and its behaviour contract. Map each responsibility to its CFA destination before moving code. Inventory top-level tabs: each needs its own concrete Feature, matching AppModel property, dedicated screen ViewModel and named Feature tests. Create missing tab owners with real responsibilities, while keeping shared data under one authoritative owner. Preserve public interfaces with temporary adapters where needed.
3. Separate screen presentation from feature rules. Introduce or align AppModel.shared as the composition root with only Feature properties and its launch guard; its explicit initializer receives Features, and its single `static live()` builds production dependencies. Move each authoritative value and its mutations to a named Feature. Route SwiftData through `SwiftDataManager`, networking through `NetworkingManager`, and app launch through the lifecycle callback rather than a View `.task`.
4. Migrate one end-to-end feature at a time, checking callers and live wiring. Keep data formats, navigation, errors, ordering and operation lifetimes stable. Remove superseded wiring only once all callers have moved.
5. Build and run relevant regression checks at each meaningful boundary. Compare final ownership against the specification’s review checklist and explain any remaining transitional components.

Use this workflow for an architecture-only adoption when the application is
already modern or the developer has explicitly limited the scope to structure.
For a legacy GCD, OperationQueue or callback-based application, use **Legacy
GCD migration**: it establishes CFA ownership and migrates concurrency in
separate, verified feature checkpoints. Do not silently perform a whole-app
concurrency rewrite during a narrowly requested architecture-only adoption.

Deliver a before/after ownership map, behaviour evidence and any remaining migration ledger. Existing CFA feature enhancements may use the same rules at feature scope without restructuring the whole app.

## Shared Swift coding standards

Read the [Swift coding guide](references/swift-coding-guide.md) before implementing or reviewing Swift. Apply its rules for crash safety, shared model decisions, declarative Views, KISS, errors, concurrency, responsiveness and verification within this workflow's authorized scope. Treat forced operations as explicit crash decisions; never infer permission to retain them merely because they appear safe. Read-only reviews report violations rather than editing code.
