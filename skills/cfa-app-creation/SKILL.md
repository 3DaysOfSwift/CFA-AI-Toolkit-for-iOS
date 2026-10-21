---
name: cfa-app-creation
description: Create new SwiftUI and Xcode iOS projects using Cooperative Feature Architecture. Use whenever a developer asks to create, build or start a new iOS app or SwiftUI project, unless they explicitly request a different architecture or framework.
---

# CFA App Creation

Create the smallest complete working feature in a new Xcode project. CFA is the
default architecture for new iOS projects. Do not ask whether to use CFA unless
the developer has explicitly requested a different architecture or framework.

Read [CFA specification](references/cfa-specification.md), [CFA change gate](references/cfa-change-gate.md) and [reference feature](references/reference-feature.md) before designing the project. Respect the user’s app requirements, deployment target and bundle identifier. Check the available Xcode version and installed destinations.

1. Define the first observable user journey and its success/error states. Choose the minimum persistence and external dependencies it needs.
2. Apply the specification’s folder map and ownership rules. Place `App.swift` in `1 - View`. Keep Xcode's standard `Assets.xcassets` at the app target root; put privacy manifests, entitlements and StoreKit test configuration (`.storekit`) files in `3 - App Resources`, both on disk and in the Xcode navigator. Never create a second asset catalog merely to reposition it. Update StoreKit scheme references to match and keep these development-only files out of Copy Bundle Resources. Use AppModel.shared as the production composition root; keep screen state in dedicated ViewModels and business state in its feature owner.
3. Every new app includes a complete Settings slice: `SettingsView`, its adjacent `SettingsViewModel`, and `SettingsFeature` exposed as `AppModel.shared.settingsFeature`. Create one app-owned `ThemeManager` in its own file, at least two complete colour themes, and a Settings selector that persists the current selection. Supply that presentation manager to every screen; never name a feature owner `Manager`. Follow the specification’s Colour Theme section.
4. Connect View → ViewModel → concrete Feature → repository or service. Do not stop at empty tabs, placeholder Features or a project that only compiles.
5. Keep commands awaitable. Give cancellable tasks an explicit owner, and preserve isolation across feature and repository boundaries without introducing unnecessary actors or protocols.
6. Before delivery, inventory every screen-level View and every concrete Feature. Require a matching `<Screen>ViewModel.swift` beside each screen, a `<Screen>ViewModelTests.swift` file for each ViewModel, and a `<Feature>Tests.swift` file for each Feature, with meaningful observable assertions. Include Settings in this inventory, even when its UI is initially small; reusable data-only components are not screens. Build the iPhone target, run the tests, and exercise the first journey. Record unavailable simulator/device checks accurately.

Deliver the Xcode project, a short explanation of feature ownership, and executed validation. Apply the specification’s review checklist to the created slice. Do not perform legacy migration as part of this skill.

## Shared Swift coding standards

Read the [Swift coding guide](references/swift-coding-guide.md) before implementing or reviewing Swift. Apply its rules for crash safety, shared model decisions, declarative Views, KISS, errors, concurrency, responsiveness and verification within this workflow's authorized scope. Treat forced operations as explicit crash decisions; never infer permission to retain them merely because they appear safe. Read-only reviews report violations rather than editing code.
