---
name: cfa-app-creation
description: Create and iteratively shape new SwiftUI iOS products using CFA, from initial Xcode scaffolding through ongoing new-product development. Use for new-app creation and continued product design, unless another architecture is requested. Bounded feature, tidy-up and maintenance tasks retain their own scopes.
---

# CFA App Creation

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
A detail View may construct its own State-backed ViewModel from a selected immutable snapshot
in its initializer. Never inject or share ViewModels. Keep screen and scene
selection in presentation and follow the [detail snapshot lifetime rule](references/spec/rules/cfa-ui-03.md)
when the source data changes. Review-only work
reports violations; tests inject Features into ViewModels, not ViewModels into Views.

Create the smallest complete working feature, then continue shaping the new
product across later requests. Record new-product development in project
instructions when creating the app. Read [new-app design defaults](references/new-app-design-defaults.md)
before choosing initial visuals. On later iterations, reuse the existing app
and honour choices already made; do not restart scaffolding or reapply defaults.
CFA is the default architecture for new iOS projects. Do not ask whether to use CFA unless
the developer has explicitly requested a different architecture or framework.

Read [CFA specification](references/cfa-specification.md), [CFA change gate](references/cfa-change-gate.md) and [reference feature](references/reference-feature.md) before designing the project. Respect the user’s app requirements, deployment target and bundle identifier. Check the available Xcode version and installed destinations.

1. Define the first observable user journey and its success/error states. Choose the minimum persistence and external dependencies it needs. Identify Features by business capability and map each screen to its dedicated ViewModel and required AppModel Features. A screen can present several independent business capabilities, and several screens can use the same Feature. Give each actual Feature named tests; do not create a Feature solely to match a screen or tab. Shared business state keeps one authoritative owner.
2. Apply the specification’s folder map and ownership rules. Place `App.swift` in `1 - View`. Its `body` declares one stable root View and presentation modifiers, with no conditional startup UI, database access, or stored AppModel; the root View handles navigation only. Keep Xcode's standard `Assets.xcassets` at the app target root; put privacy manifests, entitlements and StoreKit test configuration (`.storekit`) files in `3 - App Resources`, both on disk and in the Xcode navigator. Never create a second asset catalog merely to reposition it. Update StoreKit scheme references to match and keep StoreKit test configuration out of the app target's Copy Bundle Resources. Include the privacy manifest in the app bundle and use entitlements for signing. Use AppModel.shared as the production composition root; keep screen state in dedicated ViewModels and business state in its feature owner. Apply the [shared constants rule](references/spec/rules/cfa-const-01.md). Start without a constants enum and add a purpose-named enum with static properties when the app has genuinely shared values. Keep Feature-specific values with their Feature. Use authoritative bundle metadata for app identity, localization resources for translatable text, and keep secrets out of app constants.
3. Include the complete Settings slice: SettingsView, its adjacent SettingsViewModel and SettingsFeature. For a fresh design without other user direction, use the new-app design defaults for themes and Settings presentation. A supplied design or a later explicit choice overrides these visual defaults. Do not add palettes, reset themes or restore removed content on subsequent iterations.
4. Connect View → ViewModel → concrete Feature. Add an internal microservice when the Feature needs to access networking, storage or device APIs. AppModel stores Features, its launch guard, and any private task handles needed to own app-wide listeners; its explicit initializer assigns injected Features, sets the launch guard to `false`, and sets listener handles to `nil`. Its single `static func live()` builds production dependencies. AppModel starts and owns app-wide listeners and forwards events to the relevant Feature. If SwiftData is used, create `SwiftDataManager`; if networking is used, create `NetworkingManager` to start every `URLSession` request through it. Composition code may configure and inject the session. Prefer a stateless value type when it meets the app’s needs. Keep independent requests able to progress in parallel unless a documented policy limits them. If shared request state needs an actor, protect that state without waiting for one response before starting another independent request. Call the AppModel launch signal directly and synchronously from `UIApplicationDelegate.application(_:didFinishLaunchingWithOptions:)`. AppModel invokes each applicable Feature startup method and starts its app-wide listeners before the delegate returns. Features may initiate their own asynchronous work without making launch wait for disk or network completion. Use a screen `.task` for initial work tied to that screen’s lifetime, without assuming it completes before the screen appears. The Feature shares one refresh when equivalent callers can use the same outcome. Queue distinct commands that must each take effect, even when their inputs match. Do not stop at empty tabs, placeholder Features or a project that only compiles.
5. Keep commands awaitable. Give cancellable tasks an explicit owner, and preserve isolation across Features and their supporting microservices without introducing unnecessary actors or protocols.
6. Before delivery, inventory every screen-level View and every concrete Feature. Require a matching `<Screen>ViewModel.swift` beside each screen, a `<Screen>ViewModelTests.swift` file for each ViewModel, and a `<Feature>Tests.swift` file for each Feature, with meaningful observable assertions. Include Settings in this inventory, even when its UI is initially small; reusable presentation components can accept snapshots, bindings and action closures that forward intent to their owning screen. They do not need a dedicated screen ViewModel. Complete the new-app Settings pass using the approved design. When the developer has not chosen otherwise, include the default About section and outside-cell version footer. Wherever the design displays bundle metadata or capability descriptions, use the app’s real metadata and verified capabilities. Build the iPhone target, run the tests, and exercise the first journey. Record unavailable simulator/device checks accurately.

Deliver the Xcode project, a short explanation of feature ownership, and executed validation. Apply the specification’s review checklist to the created slice. Do not perform legacy migration as part of this skill.

When adding a SwiftUI preview, construct the screen as usual, for example
`#Preview { NotesEditorView() }`. The screen constructs its ViewModel and
the ViewModel obtains its Feature through the normal dependency path. A detail
preview may supply the same immutable selection as its production caller.
Keep SwiftData access in the storage service and out of the preview.

When the app needs an event independently of its screens, apply the
[app-wide listener rule](references/spec/rules/cfa-app-02.md). Drive a
controlled event source after repeated launch signals. Verify that one
AppModel listener forwards each event to the owning Feature even with no
relevant screen mounted. Shut down isolated listeners at the end of the test.

If the product includes paid capabilities, apply the
[paid capability rule](references/spec/rules/cfa-pay-01.md). Give
`PurchasesFeature` ownership of entitlement state. Check access in the
screen's ViewModel before presenting or invoking the paid capability. Trace
any other entry point, such as a notification action or shortcut, to its own
guard and test locked and entitled outcomes. If entitlement can change while a
route suspends before use, recheck it before presenting or invoking the paid
capability. Verify this by revoking access during the suspension. Keep pricing
policy outside the capability Feature. Protected server operations enforce their own access.

If the product opens destinations from URLs or notification actions, apply
the [deep-link rules](references/spec/rules/cfa-link-01.md). Route opening
requests to `DeepLinkingFeature` for validation and durable pending storage.
Let each scene decide whether to navigate and preserve its active edits or
payment flow. Use the rule’s verification checklist for failed saves,
competing scenes, and durable removal after navigation or explicit dismissal.
Scheduling and delivery alone do not create pending requests. For multi-window
apps, apply the [scene navigation rule](references/spec/rules/cfa-link-02.md).
Keep navigation state in each scene and allow either scene to open a shared
pending request. Verify that one scene can open a different request while
another scene is still deciding what to do with its own.
Add a separate notification history or global navigation router only when
the product requires one.

When persistence is used, apply the
[database availability rule](references/spec/rules/cfa-launch-02.md). Keep the
root and unaffected destinations available while the first store open is
pending or fails. Verify that the affected screen can retry the same request
at the configured location. Separately fail a fetch after the store opens and
verify retry reuses that store. Verify actual store opening and navigation
separately from controlled tests.

When a replaceable download needs a cache, apply the
[optional snapshot rule](references/spec/rules/cfa-cache-01.md). Use JSON
by default for a simple cache. Start refresh independently of restoration,
then publish the current response and complete the refresh without waiting
for the cache write. Hold the cache write open in a test to verify both outcomes.
For durable user edits, apply the
[local draft rule](references/spec/rules/cfa-ui-04.md) and the
[recoverable failure rule](references/spec/rules/cfa-error-01.md).
Keep the editable draft in the screen's ViewModel and submit the proposed
value to its Feature. Verify that a failed save leaves the editor open with
the draft intact and leaves the last confirmed value unchanged. A successful
retry publishes the replacement only after persistence succeeds. Verify that
Cancel discards the unsaved draft without writing to storage.

If the product requires offline edits or cross-device data, apply the
[sync rule](references/spec/rules/cfa-sync-01.md). Choose storage and transfer
according to the target capabilities and the product's data contract. Agree
on what local success means, what requires server confirmation, and how
conflicts or rejections appear to the user. For custom-server offline edits,
save the edit and its pending-sync metadata together before reporting local
success. Force a local write failure and verify that the app reports no local
success and makes no edit eligible for upload. Verify failed sync and restart.
Simulate the server applying an edit
but losing its reply, then retry with the original identity and confirm one
logical server change. For
Apple-managed sync, verify the account, schema and conflicting offline
edits on supported devices. Add synchronization only for a product need.

## Test targets

Start with the app target and its unit-test target. Add product targets such
as a widget or Watch app when the request calls for them. Do not create a
UI-test target or leave an empty `AppNameUITests` folder in a new project.
Feature and ViewModel tests belong in the unit-test target. Add UI automation
only after an explicit request identifies the scenario it should cover.

## Additional product targets

For system background work in scope, apply the
[background-work rule](references/spec/rules/cfa-bg-01.md). Keep registration
and work with the owning Feature. Verify each permitted identifier registers
once during synchronous launch and scheduling happens separately. Check that
success, failure and expiration each complete the system callback exactly once,
including when expiration races normal completion. Verify that expiration
cancels the owned work. Verify actual delivery separately on a supported device.

When the requested app includes a widget or another device target, apply the
[multi-device rule](references/spec/rules/cfa-device-01.md). Include the
shared Model and only that target’s Views and ViewModels. Compose services for
each process and keep business rules shared. Build each target and verify its
source membership and API availability. Test any required snapshot handoff
and receiving Feature update on supported devices separately from the build.
Use the rule’s verification checklist for widget reload ordering and missing,
unreadable, delayed or stale snapshots.

## Settings About and footer

Use the new-app design defaults' Settings About and footer section during
initial design unless the user specifies otherwise. On later iterations,
preserve the chosen layout and truthful capability descriptions. Do not
reintroduce a footer that the user removed or repeatedly offer one.

## Orientation and archive checks

Apply the specification's Supported Orientations and Archive Validation rule
to every new project, including copied blueprints. Declare orientations for
each supported device family in every build configuration. For universal apps,
default to portrait and both landscapes on iPhone and all four on iPad. Honour
an explicit iPhone choice and keep all four iPad orientations when multitasking
is supported. Preserve the intended device families when resolving warnings.

After a generic iOS-device Release build, run
`node scripts/verify-ios-orientations.mjs <path-to-built-app>` from this skill's
directory. The [checker](scripts/verify-ios-orientations.mjs) also accepts an
`.xcarchive` or built `Info.plist`. It requires Node.js and macOS `plutil`.
Run it against the archive before distribution when archiving is in scope.
Report any unavailable build or archive check; do not equate this metadata
check with visual rotation testing or a successful App Store upload.

## App identity check

After the same generic iOS-device Release build, run
`node scripts/verify-ios-app-identity.mjs <path-to-built-app>` from this
skill's directory. The [checker](scripts/verify-ios-app-identity.mjs) also
accepts an `.xcarchive` or built `Info.plist`. It requires concrete, non-empty
bundle identifier, display name, marketing version, and build number values;
unresolved build settings and template placeholders fail the check. Run it
against every newly created app target before handoff and against the archive
when archiving is in scope. Report an unavailable build or archive check
accurately.

## Initial app icon

For initial app creation, follow the new-app design defaults' icon section.
Use supplied artwork first; otherwise the bundled
[CFA starter icon set](assets/AppIcon.appiconset/Contents.json) is available.
Configure and verify the target rather than leaving an empty icon set.
On later iterations preserve chosen branding; inspect or repair icons when
the current task calls for it, not as a recurring offer.

## Shared Swift coding standards

Read the [Swift coding guide](references/swift-coding-guide.md) before implementing or reviewing Swift. Apply its rules for crash safety, shared model decisions, declarative Views, KISS, errors, concurrency, responsiveness and verification within this workflow's authorized scope. Treat forced operations as explicit crash decisions; never infer permission to retain them merely because they appear safe. Read-only reviews report violations rather than editing code.
