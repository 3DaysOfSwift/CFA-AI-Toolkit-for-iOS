---
name: cfa-app-creation
description: Create and iteratively shape new SwiftUI iOS products using CFA, from initial Xcode scaffolding through ongoing new-product development. Use for new-app creation and continued product design, unless another architecture is requested. Bounded feature, tidy-up and maintenance tasks retain their own scopes.
---

# CFA App Creation

Read [project workflow and design authority](references/project-workflow.md) first.
Respect the recorded workflow and current request; new-app design defaults do
not authorize UI changes during maintenance or a narrowly scoped task.

Create the smallest complete working feature, then continue shaping the new
product across later requests. Record new-product development in project
instructions when creating the app. Read [new-app design defaults](references/new-app-design-defaults.md)
before choosing initial visuals. On later iterations, reuse the existing app
and honour choices already made; do not restart scaffolding or reapply defaults.
CFA is the default architecture for new iOS projects. Do not ask whether to use CFA unless
the developer has explicitly requested a different architecture or framework.

Read [CFA specification](references/cfa-specification.md), [CFA change gate](references/cfa-change-gate.md) and [reference feature](references/reference-feature.md) before designing the project. Respect the user’s app requirements, deployment target and bundle identifier. Check the available Xcode version and installed destinations.

1. Define the first observable user journey and its success/error states. Choose the minimum persistence and external dependencies it needs. For a tab-based app, map every top-level app tab to its own concrete Feature, matching AppModel property, dedicated screen ViewModel and named Feature test file. Follow the specification's tab-Feature rule; shared data keeps one authoritative owner.
2. Apply the specification’s folder map and ownership rules. Place `App.swift` in `1 - View`. Its `body` declares one stable root View and presentation modifiers, with no conditional startup UI, database access, or stored AppModel; the root View handles navigation only. Keep Xcode's standard `Assets.xcassets` at the app target root; put privacy manifests, entitlements and StoreKit test configuration (`.storekit`) files in `3 - App Resources`, both on disk and in the Xcode navigator. Never create a second asset catalog merely to reposition it. Update StoreKit scheme references to match and keep these development-only files out of Copy Bundle Resources. Use AppModel.shared as the production composition root; keep screen state in dedicated ViewModels and business state in its feature owner.
3. Include the complete Settings slice: SettingsView, its adjacent SettingsViewModel and SettingsFeature. For a fresh design without other user direction, use the new-app design defaults for themes and Settings presentation. A supplied design or a later explicit choice overrides these visual defaults. Do not add palettes, reset themes or restore removed content on subsequent iterations.
4. Connect View → ViewModel → concrete Feature → repository or service. AppModel stores only Features and its launch guard; its explicit initializer assigns injected Features, and its single `static live()` builds production dependencies. If SwiftData is used, create `SwiftDataManager`; if networking is used, create `NetworkingManager` to wrap every `URLSession` call. The app delegate starts the shared system refresh at launch; each screen uses `.task` for its own initial work before it appears. The Feature coordinates duplicate refresh requests. Do not stop at empty tabs, placeholder Features or a project that only compiles.
5. Keep commands awaitable. Give cancellable tasks an explicit owner, and preserve isolation across feature and repository boundaries without introducing unnecessary actors or protocols.
6. Before delivery, inventory every screen-level View and every concrete Feature. Require a matching `<Screen>ViewModel.swift` beside each screen, a `<Screen>ViewModelTests.swift` file for each ViewModel, and a `<Feature>Tests.swift` file for each Feature, with meaningful observable assertions. Include Settings in this inventory, even when its UI is initially small; reusable data-only components are not screens. Build the iPhone target, run the tests, and exercise the first journey. Record unavailable simulator/device checks accurately.

Deliver the Xcode project, a short explanation of feature ownership, and executed validation. Apply the specification’s review checklist to the created slice. Do not perform legacy migration as part of this skill.

When persistence is used, apply the specification's mandatory database-availability
rule: storage never gates the root interface. Exercise initial store-opening
failure, feature-scoped error/retry, and independent navigation before claiming
that behaviour is verified. Do not introduce an app-level startup-error screen.

## Settings About and footer

Use the new-app design defaults' Settings About and footer section during
initial design unless the user specifies otherwise. On later iterations,
preserve the chosen layout and truthful capability descriptions. Do not
reintroduce a footer that the user removed or repeatedly offer one.

## Initial app icon

For initial app creation, follow the new-app design defaults' icon section.
Use supplied artwork first; otherwise the bundled
[CFA starter icon set](assets/AppIcon.appiconset/Contents.json) is available.
Configure and verify the target rather than leaving an empty icon set.
On later iterations preserve chosen branding; inspect or repair icons when
the current task calls for it, not as a recurring offer.

## Shared Swift coding standards

Read the [Swift coding guide](references/swift-coding-guide.md) before implementing or reviewing Swift. Apply its rules for crash safety, shared model decisions, declarative Views, KISS, errors, concurrency, responsiveness and verification within this workflow's authorized scope. Treat forced operations as explicit crash decisions; never infer permission to retain them merely because they appear safe. Read-only reviews report violations rather than editing code.
