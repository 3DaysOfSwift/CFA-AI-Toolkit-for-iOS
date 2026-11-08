# Cooperative Feature Architecture (CFA)

## Purpose of this Document

This document defines the AppModel, Feature, MVVM layered architecture
used by Trend and intended for future 3 Days of Swift Concurrency reference
applications. It is a free template for iOS developers and AI coding agents
creating, changing, or reviewing maintainable production SwiftUI applications
that use cooperative Swift Concurrency.

## 17 Years Experience in iOS

The template distils 17 years of experience building, publishing, and
maintaining commercial iOS applications with teams using many different custom
architectures. Those years revealed a recurring problem: teams can mistake
complexity for intelligence, even though every unnecessary layer makes an
application harder to understand, change, and maintain.

## A Template for Developers and AI

Explore the [CFA project examples](spec/examples/open-source-apps.md) for
real source code related to CFA capabilities and migration. Each link identifies
what to inspect. Real apps evolve and may contain older conventions or ongoing
migration work; use the current specification as the authority rather than
assuming an entire referenced project conforms to every rule.

For the reasons behind CFA decisions, browse the [CFA explanations](spec/explanations.md)
and select the topic relevant to the work. The specification remains authoritative
when an explanation reflects an earlier version of the guidance.

This architecture is offered as a practical gift to the iOS community. Its
consistent Xcode project structure gives developers a shared visual map of the
application and gives AI models strong, representative input. New features can
be added within a small, clearly owned area while communication with the rest
of the application remains explicit and coordinated. The goal is to improve
future code generation without sacrificing the readability and maintainability
required by the people who will own the code afterwards.

## Swift coding standards

Read and apply the [Swift coding guide](swift-coding-guide.md). It defines the common rules for all toolkit workflows: deliberate crash decisions, target-independent model logic, declarative Views, simple design, honest errors, explicit concurrency, responsive loading and evidence-based testing. The guide is maintained alongside this specification and bundled with every skill.

## Architecture versus product design

Read [project workflow and design authority](project-workflow.md) before applying
this specification. Architecture rules define ownership and execution boundaries;
[new-app design defaults](new-app-design-defaults.md) define optional starting
visual choices. They must not turn migration, review or tidy-up into a redesign.

For migration, prioritise preserving the application's business behaviour and
user-facing capabilities while moving its implementation to CFA and Swift
Concurrency. Modernisation is not a separate migration objective: make changes
needed for the migration and supported platforms, not a search for unrelated
upgrades. Do not preserve a
confirmed defect merely because it was present in the old code: fix defects
within the migration scope, protect the intended behaviour with tests and
explain the correction. Preserve stored data and meaningful interactions.
Platform changes or necessary replacement of deprecated components may cause
minor visual or interaction differences; record
material differences rather than requiring pixel-identical results. Do not
silently remove capabilities, impose new-app defaults, or invent business rules.
Resolve genuinely ambiguous product decisions with the developer.

## Project Identity

For a new application, use the developer’s organisation prefix and a bundle-safe
app name. Ask for the prefix if it is not supplied; for disposable examples use
`com.example.<AppName>`. Test targets append their target name. Never change an
existing bundle identifier without an explicit request.

The original 3 Days of Swift Concurrency projects use
`com.3DaysOfSwiftConcurrency.<AppName>` as their organisation convention. It is
not a requirement of CFA or a default for other developers.

Before handing over every newly created Xcode project, build for a generic iOS
device and inspect the *built* app's `Info.plist`. It must contain concrete,
non-empty values for `CFBundleIdentifier`, `CFBundleDisplayName`,
`CFBundleShortVersionString` (marketing version), and `CFBundleVersion` (build
number). Do not treat an Xcode build-setting expression or a template token as
filled-in metadata. This check applies to each app target; test targets use
their own bundle identifiers but do not need a user-facing display name.

### Test Target Defaults

Create a unit-test target for each new app, but do not create a UI-test target
or an empty `AppNameUITests` folder. CFA's new-project tests cover Feature and
ViewModel behaviour in the unit-test target; an unused UI-test target adds
navigator noise and build work without evidence. Add UI tests only when the
developer explicitly requests a defined UI automation scenario.

## Name and Scope

The product is **CFA AI Toolkit for iOS**. Use that exact name for the toolkit
and plugin in public-facing titles, descriptions, documentation and messages.
The architecture is **Cooperative Feature Architecture (CFA)**, shortened to
**CFA**. The toolkit supplies skills, tools and templates that apply CFA; the
architecture itself is not the toolkit. Keep descriptive component names such
as CFA Inspector and CFA App distinct from the product name.

Stable package/plugin identifiers, command names, asset filenames and installer
ownership markers are compatibility contracts, not display branding. Do not
rename them merely to update wording. Historical names may appear when clearly
identified as historical or needed to explain an upgrade.

CFA groups coherent feature state and behaviour behind narrow APIs and explicit
owners. “Cooperative” describes how features collaborate. Swift’s cooperative
runtime is a separate concept: Swift Concurrency does not mandate feature-based
architecture. CFA does not require one actor per feature or all feature code in
one class. Keep the documented ViewModel, feature, worker and repository boundaries.

This is an application architecture, not a runtime framework dependency. Its
skills assist construction, migration and review; they do not prove correctness.

## Governing Principles

Three principles govern every rule in this document:

1. **Reduce code complexity.** A developer should be able to find behaviour,
   understand ownership, and make a change without learning an oversized object
   graph or tracing unnecessary layers.
2. **Apply KISS relentlessly.** Build direct, named features that perform the
   work the application needs. Add no coordinator, wrapper, abstraction,
   protocol, or architectural ceremony unless it provides an immediate and
   clearly explainable benefit.
3. **Name to inform; prioritise readability.** Naming is an act of giving the
   reader more information about what is happening. Names communicate meaning,
   responsibility and intent—not merely identify a symbol. Prefer informative
   names and understandable steps over shorter code or dense chains of objects
   and calls. Readability makes maintenance easier; fewer characters or lines
   are not evidence of better code. Keep concise expressions when they are
   already clear, and introduce named intermediate values where they explain
   the work without adding unnecessary abstractions.

## Coordinated Application Flow

The coordination between SwiftUI, ViewModels, features, repositories,
and lower-level device APIs separates the application's execution paths and
behavioural responsibilities into one understandable flow through a layered
system. Together, these parts exist to make a real-world commercial application
simpler.

## Maintenance over Complexity

When an architectural choice adds code without making ownership, behaviour,
testing, or maintenance clearer, reject it. If a feature is divided
across several additional managers or layers, question what the increased
complexity genuinely provides. Continue only when its benefits outweigh its
maintenance cost.

The code is not merely editable. In a commercial application, a team of four or
more engineers may change it every working day for 48 weeks of the year. The
primary objective is to build the desired service. The secondary objective is
to ensure that the team can maintain that service easily throughout its life.

## Layered Architecture

The governing dependency flow is:

```text
View
  ↓
ViewModel
  ↓
Feature
  ↓
Microservices
```

User intent moves down through the layers and state or results flow back up. A
View reports intent to its ViewModel, the ViewModel calls the concrete Feature,
and the Feature applies the application's rules. Its internal microservices,
such as networking, data-storage and device API adapters, interact with local
storage, remote servers or system APIs when the capability needs them. These
are supporting code inside the app, not necessarily separately deployed server
applications. The Feature's API is its
exposed methods and state, not a separate layer. AppModel constructs and makes
Features available; it is not a separate step in every operation.

Keep this route short, but never bypass an established owner for convenience.
Doing so places knowledge in the wrong type: a View begins to understand
persistence, a ViewModel duplicates business rules, or a Repository decides
application behaviour. Do not add layers for their own sake; use the fewest
layers needed while keeping every responsibility clear, testable, and easy to
find.

**Keep single-app code in the app target.**

For a new app, keep first-party application code in the app target and use
purpose-named folders to communicate ownership. Do not create a local Swift
package merely to group code, mimic a folder, or prepare for hypothetical reuse.
A single-app project can be cleanly organized without introducing another module.

Encapsulation alone is not sufficient reason to extract app-owned code into a
separate module. A team working across the whole app must still understand, debug
and change that implementation; additional imports, access-control declarations,
targets and dependency configuration can add friction. Prefer clear Feature
ownership, appropriate access control and purpose-named folders within the app
target unless a separate boundary provides a concrete benefit that outweighs
those costs.

Introduce a separate package only for a clear, current need, such as code shared
across multiple apps or a demonstrable independent distribution or build
boundary. Explain the benefit and costs. For existing projects, respect their
established boundaries and the requested scope; do not automatically remove or
create packages as an unrelated cleanup. Evaluate each possible consolidation
against actual consumers, resources, tests, generated code, and build settings.
Measure runtime or build performance before claiming a package boundary helps
or hurts it.

## Make the Architecture Visible in the Folder Structure

Use this top-level reading order:

```text
Application
├── 1 - View
│   ├── App.swift
│   ├── Theme
│   │   ├── AppColourTheme.swift
│   │   └── ThemeManager.swift
│   ├── SwiftUI Extensions
│   │   └── HabitErrorAlert.swift
│   └── Views
│       └── Feature Screen
│           ├── FeatureScreenView.swift
│           └── FeatureScreenViewModel.swift
├── 2 - AppModel
│   ├── AppModel.swift
│   ├── Features
│   │   └── Feature Name
│   │       ├── FeatureNameFeature.swift
│   │       └── Feature-owned domain types
│   └── User Data Storage
│       ├── Protocols
│       ├── Local
│       ├── CloudKit
│       └── Networking
├── 3 - App Resources
│   ├── PrivacyInfo.xcprivacy
│   ├── Purchases.storekit (when local StoreKit testing is used)
│   └── Application.entitlements
├── 4 - Swift Extensions
│   └── Type+Capability.swift
├── Assets.xcassets
└── ApplicationTests
    ├── View model tests
    └── AppModel tests
```

The Xcode navigator must communicate the design without requiring a developer
to inspect source files.

Every new CFA app includes a Settings screen, its adjacent
`SettingsViewModel.swift`, and `SettingsFeature.swift` exposed through
`AppModel.shared.settingsFeature`. Settings is a screen even when its first
version only selects a colour theme; do not collapse it into a data-only
component or call its feature a manager.

### Settings About Section and CFA Footer

See [new-app design defaults](new-app-design-defaults.md#settings-about-section-and-cfa-footer).
This is a new-product starting point, not an existing-product conformance rule.
Follow [project workflow and design authority](project-workflow.md); preserve
user-approved designs and do not repeatedly offer optional visual changes.

### Xcode Template Layout Is a Contract

For a CFA Xcode template, the on-disk path and the Xcode navigator group are
both part of the architecture. CFA follows Xcode's own app-project conventions:

- `App.swift` is in `1 - View`.
- `Assets.xcassets` stays at the app target's top level. It is Xcode's special
  asset catalog and owns the AppIcon build setting.
- Privacy manifests, entitlements and local StoreKit files are in
  `3 - App Resources`.

Do not create a second CFA asset catalog or override Xcode's inherited asset
generator. In `TemplateInfo.plist`, every CFA-owned resource needs a matching
`Path`, single-string `Group`, and `Nodes` entry. The starter's
`PrivacyInfo.xcprivacy` ensures `3 - App Resources` is a real navigator group,
not an empty visual convention.

Toolkit maintainers must run `node scripts/verify-xcode-template-structure.mjs`
after changing the CFA App Xcode template. A template is incomplete if its
generated navigator does not match this folder map.

StoreKit test configuration files (`.storekit`) belong in `3 - App Resources`
on disk and in the navigator, rather than loose at the project root. When
creating or moving one, keep the scheme’s StoreKit configuration reference in
sync. These development-only files should not be added to Copy Bundle Resources.

Independent reusable Views belong in their own clearly named files. Do not place
unrelated components in another View’s file simply because they are small.
Colocation is appropriate for private implementation details used only by that
View, not independently reusable components.

### Mandatory Initial App Icon

See [new-app design defaults](new-app-design-defaults.md#mandatory-initial-app-icon).
This is a new-product starting point, not an existing-product conformance rule.
Follow [project workflow and design authority](project-workflow.md); preserve
user-approved designs and do not repeatedly offer optional visual changes.

### Strict No File Dumping Policy

Do not create vague dumping-ground folders such as `Helpers`, `Utilities`,
`Services`, `Common`, or `Managers`. Every folder must describe the specific
responsibility of the files it owns. If a file has no obvious destination,
clarify its responsibility rather than hiding it inside a generic collection.

### Colour Theme

See [new-app design defaults](new-app-design-defaults.md#colour-theme).
This is a new-product starting point, not an existing-product conformance rule.
Follow [project workflow and design authority](project-workflow.md); preserve
user-approved designs and do not repeatedly offer optional visual changes.

### System Launch Appearance

See [new-app design defaults](new-app-design-defaults.md#system-launch-appearance).
This is a new-product starting point, not an existing-product conformance rule.
Follow [project workflow and design authority](project-workflow.md); preserve
user-approved designs and do not repeatedly offer optional visual changes.

### Supported Orientations and Archive Validation

Every new iOS app must explicitly declare supported interface orientations in
every app build configuration, including Release. For a universal app, default
to portrait and both landscapes on iPhone, and all four orientations on iPad.
Honour an explicit iPhone orientation choice while retaining all four iPad
orientations when iPad multitasking is supported. Do not set `UIRequiresFullScreen`
or remove iPad support merely to silence a validation warning.

With generated Info.plist files, set `INFOPLIST_KEY_UISupportedInterfaceOrientations`
and the iPad override `INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad`.
Check the resulting app's `UISupportedInterfaceOrientations` and
`UISupportedInterfaceOrientations~ipad` arrays, not just the project settings.
For a source Info.plist, declare those arrays directly.

Before delivery, build Release for a generic iOS device and inspect its built
Info.plist. When preparing an archive, check the plist inside the archived app
as well. Treat orientation validation warnings as defects; a successful simulator
build does not establish App Store eligibility. Exercise supported layouts in
portrait, landscape and iPad resizing before claiming UI compatibility.

Reference: [Apple supported interface orientations](https://developer.apple.com/documentation/bundleresources/information-property-list/uisupportedinterfaceorientations).

### Swift Extensions

Reserve `4 - Swift Extensions` for broadly reusable extensions of Swift standard
library or Foundation types. A filename containing `+`, or a file written in
Swift, does not by itself make the file a general Swift extension. Name a
general extension after the type and capability it adds, such as
`Date+StartOfWeek.swift`.

Place feature-specific extensions, model conversions and transport mappings
with the Feature, View or adapter that owns their meaning. First question an
extension to `AppModel`: prefer removing it by putting behaviour in the
appropriate Feature. If an extension remains justified, place it with the
owning Feature or View; put genuinely app-wide extensions beside `AppModel`.

Keep SwiftUI-specific extensions in `1 - View/SwiftUI Extensions`. Extensions
of UIKit types belong in the View layer, alongside their owner or in a shared
`UIKit Extensions` folder. Group protocols with the responsibility they support;
for example, storage contracts may live in `User Data Storage/Protocols` as shown
above. Do not create an app-wide catch-all `Protocols` folder for unrelated
responsibilities. A shared `UIKit Helpers` folder is appropriate for non-extension helpers used by
many views without a more specific owner. Cohesive private support declarations
may remain with the extension they support.

A broadly reusable `String` extension belongs in `4 - Swift Extensions`.
Shared generated or system strings that are not extensions belong with their
purpose, for example `Shared System Strings` in the View layer for localized
presentation text. App-wide system constants may live beside `AppModel` in a
purpose-named folder. Do not create a constants container speculatively when
starting an app. When an app-wide value is genuinely shared or repeated, such as
a company website or support address, define it once in a purpose-named enum
using static properties, and reuse it to prevent inconsistent copies or typos.
Keep Feature-specific constants with their owning Feature rather than placing
everything in one generic container. Read an app name or version from the
appropriate bundle metadata when that is the source of truth, and keep
localizable display text in localization resources. Do not hard-code secrets.
Keep generation paths and related lookup code together.
Platform protocols follow the same behaviour-first ownership rule; they do not
belong in an app-wide catch-all protocols folder. Never use `4 - Swift Extensions` as a
general utilities folder.

During a structural cleanup, inspect each file's declarations and callers,
not only its filename. Move files without changing behaviour, preserve Xcode
target membership and resource lookup, update generation/build scripts that
reference their paths, and verify the affected build and tests. The same
ownership reasoning applies to existing UIKit and mixed-UI projects.

### Domain Type Ownership

Domain values live with the feature that defines their meaning. A `WeightEntry`
belongs to Weight Log even though a repository persists it. Storage-only
representations—Codable documents, CloudKit field mappings, database records,
and transport payloads—remain private to their storage implementation. Never
place a domain type under storage merely because it is persisted.

## Maintain an Absolute UI and Model Boundary

`1 - View` owns presentation. `2 - AppModel` owns application behaviour.

The UI may decide:

- layout, colour, typography, animation, focus, transitions, and accessibility;
- whether a sheet, alert, menu, or navigation destination is visible;
- which chart point is highlighted;
- how model-provided information is formatted for display;
- whether a control is visually enabled using a decision already exposed by
  its ViewModel.

The UI must not decide:

- whether domain data is valid;
- what a domain-positive, domain-negative, complete, failed, or stale result
  semantically means;
- how values are calculated, classified, filtered, projected, or persisted;
- whether a date qualifies for a streak;
- which content should be selected or cycled;
- whether a purchase grants an entitlement;
- when data should be refreshed as part of an application workflow;
- how two or more feature operations form one business transaction.

Use this extraction test:

> Imagine adding an Apple Watch target to the Xcode project. Could the team
> create a working prototype in less than an hour without changing AppModel or
> any of its features? Every capability and its tested business logic should
> already exist in the Model—the AppModel layer—and be ready for a new UI to
> use.
>
> If the Apple Watch prototype requires a business decision to be copied from
> an iPhone View or ViewModel, business logic has leaked into the UI. Extract
> that decision into the Model layer and place it in the Feature that
> owns the feature.

There is zero tolerance for business logic in the UI layer. Do not excuse it
because the calculation is short, because SwiftUI makes it convenient, or
because only one screen currently uses it.

The Model determines the semantic result. The UI remains free to decide how
that result looks: a tick, cross, colour, animation, alert, or inline message.

## Give Every Unique Screen Its Own ViewModel

Every screen-level SwiftUI `View` has one dedicated, tightly coupled ViewModel.
Store both files beside one another in that screen's folder:

```text
Coffee
├── CoffeeTrackingView.swift
└── CoffeeTrackingViewModel.swift
```

Never share one ViewModel class between different screen Views. Similar screens
still have different presentation behaviour, lifetimes, state, and future
requirements. Reuse belongs below the ViewModel boundary in a feature,
or in a stateless presentational View.

A reusable presentation View may receive display data, bindings, and action
closures without needing a ViewModel. For example, a refresh button may call
an action supplied by its screen. The screen forwards that intent to its own
ViewModel, and the Feature owns the business operation. The component must not
acquire a Feature or ViewModel, or implement business rules.

### Keep SwiftUI View Construction Fast

**CFA screen ownership:** A screen owns its dedicated private ViewModel. By
 default construct it inline: `@State private var viewModel = HomeViewModel()`.
A detail screen may receive selected value data and initialise its own private
State-backed ViewModel in its View initializer using that value. Never accept,
share, inject or compute a ViewModel supplied by another View. Keep initializers
cheap and free of work-starting side effects. Stateless display components may
also receive snapshots.

The supplied snapshot is initial input, not automatically refreshed state.
State is retained for a SwiftUI identity; a changed input does not automatically
replace its ViewModel. Separate destinations and scenes need independent
presentation selections. Features own authoritative data, not tab or scene
selection. Preserve a detail snapshot and navigation when background data changes;
use explicit refresh by default where appropriate. Live updates are a product
choice. See the presentation-boundaries decision for the Next Rocket Launch policy.

Published snapshot structs representing data received from an API or persistence
layer must use `let` properties. Treat them as immutable values, including their
contents; do not embed mutable reference state that undermines the snapshot.
Decode or construct a new snapshot when confirmed data changes. Never mutate a
local copy and retain or present it as saved state. Editable form fields are
temporary unsaved drafts, distinct from published snapshots. Submit changes to
the responsible Feature, persist them, and publish confirmed state only after
the persistence operation succeeds.

For example, the destination constructs its own ViewModel from the selected
value. `LaunchSnapshot` below is an illustrative domain value; the Feature and
the rest of the screen are omitted:

```swift
@MainActor
struct LaunchDetailView: View {
    @State private var viewModel: LaunchDetailViewModel

    init(launch: LaunchSnapshot) {
        _viewModel = State(initialValue: LaunchDetailViewModel(launch: launch))
    }

    var body: some View {
        Text(viewModel.launch.name)
    }
}

@MainActor @Observable
final class LaunchDetailViewModel {
    let launch: LaunchSnapshot

    init(launch: LaunchSnapshot) {
        self.launch = launch
    }
}
```

Each independently identified destination owns its own state. The example
does not establish multi-scene behaviour by itself: verify it in the app.
An initializer may be evaluated again for a replacement View value, even when
SwiftUI retains the existing State. It must not initiate side effects.

✅ **Correct — the View owns its bespoke ViewModel and requires no dependency
injection:**

```swift
struct CoffeeTrackingView: View {
    @State private var viewModel = CoffeeTrackingViewModel()

    var body: some View {
        Text(viewModel.screenTitle)
    }
}

CoffeeTrackingView()
```

❌ **Incorrect — the caller constructs and injects the ViewModel:**

```swift
struct CoffeeTrackingView: View {
    @State private var viewModel: CoffeeTrackingViewModel

    init(viewModel: CoffeeTrackingViewModel = CoffeeTrackingViewModel()) {
        _viewModel = State(initialValue: viewModel)
    }

    var body: some View {
        Text(viewModel.screenTitle)
    }
}

CoffeeTrackingView(viewModel: CoffeeTrackingViewModel())
```

A screen View is a lightweight description of what the interface should look
like for the current state of its ViewModel. SwiftUI may create and discard View
values frequently while evaluating changes. Constructing a View must therefore
remain fast and must not start loading, persistence, networking, observation,
or any other work as a side effect.

Every screen conventionally names its one direct backing object `viewModel` and
creates it at the property declaration unless the selected-data detail exception applies.

The ViewModel initializer must also be quick and free of work-starting side
effects. It may retain the feature capabilities it needs from `AppModel.shared`,
but loading and other asynchronous work begin only through an explicit method.
`@State` associates the ViewModel with the screen's SwiftUI identity so the same
logical screen continues to observe its existing ViewModel across redraws.
That ownership must not be advertised as a guarantee that a default-value
expression never runs again: evaluation depends on the SwiftUI/toolchain API
in use. Keep construction cheap and free of observable side effects regardless.
See [Apple's State documentation](https://developer.apple.com/documentation/swiftui/state).

Apart from SwiftUI presentation state, environment-provided
presentation values, and this `viewModel`, do not make a screen View the owner
of long-lived reference objects. The View describes and reflects state; it does
not become an object-lifetime coordinator.

A ViewModel:

- is named after exactly one View;
- uses `@MainActor` and `@Observable` when it exposes UI-observed state;
- is created and owned by its View using `@State`;
- accepts narrow Feature dependencies defaulted from `AppModel.shared`; a detail
  ViewModel also accepts its selected value snapshot. Do not add unrelated
  convenience inputs, services or externally supplied ViewModels;
- lives only as long as that View lives;
- is never cached by a root ViewModel, another ViewModel, or AppModel;
- never calls another ViewModel;
- retains the smallest coherent set of narrow feature APIs required by its
  screen rather than the complete AppModel;
- converts feature state into presentation-ready values;
- accepts user intent and calls its feature API;
- names methods for the work it performs, not the UI gesture or lifecycle
  signal that reached it: use `refresh()`, `save()` and `retry()`, never
  `refreshTapped()`, `savePressed()` or `screenAppeared()`;
- owns screen-specific error text, loading state and coordinated presentation state;
- contains no reusable business rule.

The ViewModel initializer provides the live feature as its default while
remaining replaceable by tests:

```swift
init(habitsFeature: HabitsFeature = AppModel.shared.habitsFeature) {
    self.habitsFeature = habitsFeature
}
```

This is deliberate dependency injection without forcing dependency plumbing
through every SwiftUI initializer.

### CFA screen structure invariant

This is mandatory for CFA application screens. Before delivery, verify all three:

1. Every screen owns a private dedicated ViewModel, constructed inline by default. A detail View may initialise its own State-backed ViewModel from selected value data in its initializer.
2. Each ViewModel initializer defaults its narrow live feature dependencies from `AppModel.shared` while allowing tests to supply isolated replacements.
3. Never pass a ViewModel into a View. Selected value data is permitted for detail destinations; preserve independent destination identity.

Do not remove a screen ViewModel, or pass feature dependencies through a screen initializer, merely because a generic architecture guideline would use fewer types. CFA makes the ViewModel boundary explicit so every screen has one clear, testable route into the shared application graph.

A screen can present several independent business capabilities. Its ViewModel
uses the narrow Feature APIs that the screen needs, with no required minimum or
maximum count. For example, SettingsViewModel may use SettingsFeature for app
preferences and UserProfileFeature for the profile header. SettingsFeature does
not need a profile dependency merely because the screen displays an avatar.

When a ViewModel grows, ask: **is it arranging existing capabilities for this
screen, or implementing a new business capability itself?** Only the latter
points towards extracting business behaviour into the model. Keep device-specific
presentation decisions in the presentation layer; extract a focused presentation
helper only when it clarifies a real responsibility. Do not invent a facade or
Feature simply to reduce the number of ViewModel dependencies or lines of code.
Size alone is not a reason to split a ViewModel: the coordination of a richer
screen may legitimately take more code. Extract a focused presentation helper
only when its responsibility and benefit are clear; keep business behaviour in
the Model.

## Keep Screen Initializers Clean

A screen View must not receive:

- a ViewModel;
- AppModel;
- a feature;
- a repository;
- a closure taken from another ViewModel;
- navigation commands owned by an ancestor ViewModel.

Prefer:

```swift
TodayView()
```

Do not write:

```swift
TodayView(viewModel: rootViewModel.today)
TodayView(onAdd: rootViewModel.addEntry)
```

A detail destination may receive selected value data and construct its own
ViewModel. The Feature owns authoritative data; screen and scene selection
remain presentation concerns. Preserve independent navigation and existing
product behaviour. A reusable presentation component may receive display data,
bindings and actions that report user intent to its screen, for example:

```swift
struct RefreshButton: View {
    let action: () -> Void
    var body: some View { Button("Refresh", action: action) }
}

RefreshButton { viewModel.refresh() }
```

This does not make the closure a business service or transfer another screen's
ViewModel responsibilities. Screen Views retain their own ViewModels; reusable
components forward intent without implementing business rules.

Each screen owns the sheet, alert, or navigation destination it presents. Do
not create an application-wide router merely to move local presentation state
away from the View.

**Deep links and notification destinations.** In a new app that supports these
entry points, use a dedicated `DeepLinkingFeature` for the shared destination
handling of incoming links and actions on local and push notifications. It
interprets and validates each request, owns the pending destinations and uses a
storage service to persist their safe representations. AppModel exposes the
Feature. System callbacks forward requests into this same system; do not assume
that every push notification contains a navigable destination.

Record a request when the app is asked to open a URL or receives a user action
on a local or push notification. Scheduling a notification or its delivery alone
does not add it to the pending list. The Settings screen presents the recorded
pending requests; it is not a separate history of delivered notifications.

During migration, preserve existing deep-link, notification and history
capabilities; the new-app defaults below do not authorize removing them. Adopt
this design when appropriate to the requested migration and existing behaviour.

The receiving scene owns navigation, presentation and decisions about leaving
its current screen. Do not place tab selection, sheets or screen dismissal in
the Feature. A scene-provided asynchronous handler can attempt a destination and
return `true` only after navigation to that page occurs. The Feature removes
the corresponding pending request after that result, not merely because the
user agreed to navigate. A `false` result, cancellation, unavailable scene or
failed navigation leaves it pending; a later scene can offer it again. The
scene handler checks cancellation before navigating and returns `false` if it
does not navigate. If it has already navigated, it returns `true` even if
cancellation arrives afterward, so an opened request is not offered again. The
destination screen then owns its own data loading, errors and refresh: do not
wait for content to load before treating navigation as successful.

For example, when a user selects a pending item in Settings, its ViewModel
asks `DeepLinkingFeature` to open that request. The Feature invokes the handler
for the receiving scene; the scene navigates and reports the result. Configure
the handler with a scene-appropriate lifetime so multiple windows do not share a
single navigation state. This is the intended responsibility flow; choose the
concrete handler and registration mechanism to suit the app and test it.
Either window can open a shared pending request. On successful navigation in
one window, remove the shared pending item without changing another window's
navigation. Coordinate concurrent attempts so the same request is not opened
twice inadvertently.

Protect an unsaved edit or an active payment flow from interruption. If a user
chooses to continue editing, retain the request across launches and offer it
again through a pending-notifications or pending-links area. Remove an item on
successful navigation or explicit dismissal. Support multiple incoming requests
without silently replacing earlier ones, and avoid duplicate handling when
scenes receive the same event. Do not create a separate notification history
or global UI router by default. Store only safe data needed to identify and
present a request; handle expired or unavailable destinations clearly. Persist
before claiming a request is safely kept, and handle storage failures honestly.

For this pending list, record notification actions received from the system,
not notifications merely scheduled or delivered. iOS does not guarantee that
every background push is delivered to the app. If a product separately requires
a complete notification inbox, choose an appropriate durable source for that
requirement; do not assume local callbacks capture every delivery.

## Define Features by Business Capability, Not by Screen or Tab

A screen can present several independent business capabilities. A Feature can
support several screens and device experiences, or have no dedicated screen.
Features own meaningful application capabilities and their authoritative business
state; screens and tabs do not determine the number of Features.

For a real implementation of a Feature owning domain state, inspect
[Trend's WeightLogFeature](https://github.com/3DaysOfSwift/Trend-iOS-App-Swift-Concurrency-CFA/blob/2a747bc222535e9fda01ed722e9c2c103fb98905/Trend/2%20-%20AppModel/Features/WeightLog/WeightLogFeature.swift).
The linked project illustrates this specific responsibility; assess its other
architectural choices separately against the current specification.

During creation or migration, main screens are useful clues for discovering
capabilities, not a requirement to create one Feature per screen or tab. Record
each route as screen → dedicated ViewModel → required AppModel Features → named
Feature tests. Several routes may use the same Feature, and a route may use
several Features. Do not create empty tab owners or duplicate state to satisfy
a one-to-one mapping.

For example, SettingsViewModel can combine SettingsFeature and UserProfileFeature.
Other screens can observe that same UserProfileFeature through their own
ViewModels. The profile retains one authoritative owner. Navigation, tab selection
and device-specific layout remain presentation responsibilities.

Start new apps with independent Features using lower-level services supplied
through their initialisers. A screen combining their outputs does not require
the Features to depend on each other. An architectural extension that composes
Features needs an identified business responsibility; do not add one solely
because a ViewModel has several dependencies. Keep any such composition explicit,
directional and free of cycles, and preserve existing behaviour during migration.

An evolving app may reveal a distinct, reusable business capability that
coordinates other Features. This coordinating Feature—sometimes called a
“big brother Feature” in discussion—is a normal Feature in AppModel and the
standard Feature folder structure. It owns its own business decisions and uses
the existing Features rather than duplicating their authoritative state. For
example, a Today capability may decide which accomplishments or resources to
show using data from another Feature. A screen merely arranging existing data
does not by itself justify that extra Feature, and a migration must not create
one coordinator for every screen.

Conversely, work that sounds like coordination is not necessarily several
Features. If the product's checkout is one cohesive capability, a
`CheckoutFeature` can own its cart and coordinate a private payment service to
complete a purchase. Split or compose capabilities only when actual business
responsibilities and reuse justify it.

Verify each screen's actual Feature dependencies and each Feature's named
behavioural tests. Test consistency across screens that use shared state.
Introduce an additional Feature when there is a distinct business capability,
not merely a new tab, screen, visual section or device target.

An API endpoint is evidence about a capability, not an instruction to create
one Feature per endpoint. For example, one `PostFeature` can own posts and their
comments even when it calls different APIs for each. Similarly, a
`UserProfileFeature` can own profile, account and login behaviour when those
form one coherent capability. Choose boundaries from the app's actual business
requirements; do not multiply similar Features merely to mirror HTTP calls.

For a small application, an existing account operation can coordinate the
Features affected by it directly. For example, `UserProfileFeature.signOut()`
can call explicit account-data clearing operations on `OrdersFeature` and
`FavouritesFeature`. The profile Feature coordinates the workflow; each
affected Feature remains the owner of its own state. Supply dependencies through
initialisation, keep the direction of dependencies free of cycles, and do not
create a separate coordinator or event infrastructure solely to relay this call.
If the workflow grows into a distinct capability, reassess its boundary rather
than assuming that a separate coordinating Feature is always required.
When sign-out fails before the session ends, keep the user signed in and retain
their account data; report the failure so they can retry. After successful
sign-out, clear account-specific Feature state. If the authentication service
can partially succeed before reporting an error, reconcile its actual session
state rather than assuming either outcome.

When the app's sign-out contract promises a fresh-install experience, clear
account-specific memory, caches and locally stored files as part of successful
sign-out. Identify data that belongs to the account before deleting it; handle
unsynchronised user work transparently and do not treat independent purchases
or user-owned documents as disposable account caches. Keep the signed-out
experience and cleanup failures truthful.

During migration, inspect whether an existing account-change event system can
be simplified into explicit calls without losing behaviour. Trace every sign-out
and account-switch entry point, including external session expiry. Define what
happens when authentication or cleanup fails, and prevent work started under an
old account from republishing its data after a switch. Cancellation alone does
not guarantee that work has stopped; validate the current account or a session
generation before publishing results. Preserve the product's privacy and
storage requirements, and test these behaviours before removing observers.

Business requirements also determine how many instances of a domain entity
exist. For a simple shopping app, start with one shared `ShoppingCartFeature`
owning one cart. Introduce multiple carts only when the product needs them:
for example, one per restaurant, one shared across scenes, or separate carts per
scene. Scene-specific presentation chooses which cart to display; the Feature
owns the cart data and should not depend on tabs or screen layout. When separate
scene carts are required, define their identity and lifetime from the product's
needs rather than creating a separate Feature instance for each ViewModel.

## Use AppModel as the Composition Root and Feature Facade

`AppModel.shared` is the one production application graph. This is an explicit
architectural decision, not an accidental global variable.

For additional device and extension targets, include the shared AppModel and
related Model source in each target, and include only the Views and ViewModels
designed for that target. Each running process or device has its own
`AppModel.shared` and Feature instances; the singleton shares memory within its
process, not across targets or devices. Verify target membership, platform and
extension API availability, and lifecycle requirements. Adapt composition or
platform-specific services where necessary without duplicating business rules.

Share useful immutable snapshots to make existing capabilities available to
additional presentations. An iPhone app and widget can exchange a snapshot via
an App Group container: safely write it before requesting a WidgetKit timeline
reload, and handle missing or unreadable data. WidgetKit controls refresh timing.
A Watch app runs on another device and cannot read the iPhone's App Group
folder: transfer a copy using Watch Connectivity when appropriate, or use a
product-appropriate cloud or server mechanism. Account for reachability, delayed
delivery, stale data and conflicts according to the product. A Feature refreshes
its own observable state when a relevant external change reaches its data
source; observation alone does not synchronize separate processes or devices.

The planned Next Rocket Launch multi-device showcase will demonstrate this
arrangement in a separate Xcode project in the same repository: shared Model
source, device-specific iPhone and Watch presentations, an iPhone widget and a
Watch countdown complication. The iPhone widget can read an App Group snapshot;
the iPhone can send the next launch to the Watch using Watch Connectivity. A
larger snapshot file transfer is an option when the Watch needs it. This is an
example project's intended design, not a requirement that every CFA app create
these targets or use the same transfer method. Verify the implementation and
device behaviour before presenting the showcase as complete.

AppModel:

- constructs and retains one instance of each app-scoped feature;
- exposes narrow feature APIs to ViewModels;
- guarantees that all scenes observe the same underlying application state;
- prevents SwiftUI environment placement from accidentally creating multiple
  Models or conflicting feature instances;
- wires dependencies in one visible `live()` factory;
- requires every dependency in its initializer;
- permits isolated AppModel graphs to be assembled in tests;
- contains application-wide lifecycle coordination when that coordination does
  not belong to one feature;
- contains no SwiftUI, navigation state, screen identity, or feature-specific
  business rules.

AppModel's stored properties include one `static let shared = AppModel.live()`,
the concrete Feature references, one private Boolean guarding launch, and any
private Task handles required to own app-wide listeners. No other application
state belongs here: no service, repository, `ModelContainer`,
startup error, loading flag, navigation state, or presentation text. A failed
feature load is retained and presented by that Feature and its screen ViewModel.
The singleton guarantees shared access to the application graph; it does not
create thread safety. Actor isolation and immutable values do that.

Tests construct isolated application graphs and never mutate
`AppModel.shared`. Previews keep the same View → ViewModel → Feature →
microservice boundaries as the app: a screen constructs and owns its ViewModel,
and its ViewModel accesses Features. A normal preview can simply use
`#Preview { NotesView() }`: the View constructs its ViewModel, whose default
Feature dependency comes from `AppModel.shared`. Do not inject a ViewModel into
a screen or place a SwiftData container or context on a View or preview.
Multiple production scenes use the shared graph so they cannot accidentally
disagree about persisted application state.

Do not give AppModel every function in the application. It is a facade over
coherent features, not a god object. A command concerning one feature
belongs on that feature's API and concrete implementation.

Do not hide production dependency construction in default initializer values.
`AppModel.init` is fully explicit: it assigns its supplied Features, initialises
the private launch guard to `false` and initialises any app-wide listener task
handles to `nil`. It does not construct or resolve dependencies. No AppModel
stored property has a default value except `shared`. Exactly one
`static func live() -> AppModel` constructs the live
services, repositories, and Features and passes only Features to `init`.
Tests construct isolated graphs by passing test Features to that same explicit
initializer. `live()` may use local lower-level values, but never retains or
exposes them as AppModel properties.

**App-wide listeners.**

AppModel starts and owns listeners needed independently of the currently
visible screen, such as an app-wide StoreKit update stream or account events.
Retain their Task handles in AppModel when the listener is asynchronous; start
each listener once, and define how it is cancelled or replaced when needed,
including in isolated tests. An app-lifetime listener may otherwise run until
the app terminates. AppModel forwards each event to the relevant Feature; that
Feature interprets it and owns the resulting business state and behaviour.
Keep event handling small in AppModel and avoid adding subscriptions unless the
app actually needs them.

Work needed only while a screen is visible belongs to that screen or its
ViewModel, with a lifetime appropriate to the presentation. Do not make a
screen-owned listener responsible for events the app must receive when that
screen is absent.

**Background work.** Each Feature owns the background capability and business
work associated with its domain. During synchronous application launch,
AppModel can call a Feature's registration method so the Feature registers its
own system background handlers. For BGTaskScheduler, register every permitted
identifier once and before launch finishes; scheduling is separate, and the
system decides when eligible work runs. Handle expiration, cancellation and
the system's completion requirements. Do not create a central background-work
Feature merely to coordinate unrelated capabilities.

When iOS delivers an event through an app delegate or another app-level entry
point, route it through AppModel to the appropriate Feature while honouring the
system callback and completion contract. Background pushes are not guaranteed
to arrive. Use the appropriate system mechanism, such as a background URLSession
for supported transfers; an ordinary Swift Task does not grant background runtime.
Work that should continue when one screen disappears is owned by its Feature,
not by that screen. This is distinct from whether iOS permits it to continue
after the whole app enters the background.

## Organize Behaviour into Cohesive Features

A CFA Feature owns the authoritative application state for a business capability
and exposes the operations that manage it. Features are isolated to the main
actor and made available through AppModel, even when no screen currently displays
their capability. This is a CFA architecture convention, not a Swift requirement.

Lower-level services fetch, persist or process data. They may retain internal
state needed to perform their work, such as in-flight requests, cached responses
or database machinery. They do not become Features merely because they contain
mutable state, and must not become competing authorities for business state.
Do not add a second application-level cache without a concrete requirement.

The default execution boundary is MainActor-isolated Features above services
that perform networking, persistence and expensive processing under their own
isolation. A NetworkingManager may be an actor; ordinary helpers can be owned
by a worker actor without each becoming an actor. Avoid MainActor isolation for
those workers unless a framework API requires it. Keep such requirements at
a narrow adapter boundary. A separate type or async keyword alone does not
move execution off MainActor: synchronous helpers run with their caller, and
async execution depends on explicit isolation and compiler settings. Keep small
coordination work cheap and move expensive work across a deliberate boundary.
Actors provide isolation, not dedicated threads.

For example, UserProfileFeature owns the current profile used by the application;
UserProfileAPI returns profile data without maintaining a second current-user
model. PostFeedFeature owns its posts, pagination cursor and loading/error state;
its API adapter returns pages. During migration, locate where downloaded data is
retained and managed as a candidate Feature boundary. API response shapes and
endpoint counts are clues, not a requirement for one Feature per endpoint.

A concrete feature owns one coherent application capability. Name its type
after that capability with the `Feature` suffix: `SettingsFeature`,
`PurchasesFeature`, `HabitsFeature`. Do not name feature owners `Manager` or
`FeatureManager`.

Every AppModel property that exposes a feature uses the same domain name and
the lower-camel-case `Feature` suffix: `settingsFeature`, `gitReposFeature`,
`purchasesFeature`. Use that exact property name for ViewModel dependencies,
initializer labels, and local references, including a reference copied from
`appModel.settingsFeature`. Never shorten one to a plural domain noun such as
`repos` or `settings`; that makes a shared capability look like a collection.
**Feature protocols are a waste of time.** In CFA, ViewModels depend directly
on concrete features. Do not create matching `FeatureAPI` protocols. Test a
ViewModel with a concrete feature whose repository or provider is replaced
by a test double. Throughout this specification, “Feature API” means the
methods and properties exposed by that concrete Feature; it does not mean a
separate protocol or an additional architectural layer.

Use a `SwiftDataManager` whenever the app uses SwiftData. It owns container and
context creation/opening and hands a narrow storage capability to the owning
Feature. A Feature may ask it to load or save; neither AppModel nor any View or
ViewModel opens a database or handles a `ModelContainer`. Keep SwiftData
records and contexts inside the persistence boundary; preserve actor isolation.

Use a `NetworkingManager` whenever the app makes network requests. It owns
`URLSession` and wraps every session call; feature-specific API adapters decode
responses and provide domain-oriented operations. AppModel may construct this
manager as a local inside `live()` and pass it to Features; it does not store or
expose the manager as an AppModel property.

For a new app, start with a simple stateless `NetworkingManager` value type when
that satisfies the application's session and concurrency requirements. Inject
it into the providers or Features that need it. A small local struct can be
stored on the stack or in registers, avoiding a separate heap allocation for
the wrapper and its associated overhead. Storage is context-dependent: a struct
stored inside a class is typically inline within that heap-allocated object,
and reference properties such as URLSession retain their own storage. Prefer
sharing a suitably configured session where appropriate; copying a struct does
not create an independent URLSession. Do not assume that every struct is stack
allocated or that changing the wrapper measurably accelerates network requests.
Check Sendable conformance, actor isolation and the project's Swift language
and default-isolation settings.

Independent network requests should be able to progress in parallel unless a
documented product, security or service policy requires otherwise. An actor
may be appropriate for shared mutable state, such as request accounting or a
system-wide request limit. Actor isolation serializes access to its state, but
an actor can accept another call when a request suspends at `await`; an actor
does not by itself serialize whole downloads. Keep synchronous actor work short,
avoid accidentally awaiting a previous request, and test overlapping requests
with controlled dependencies. URLSession configuration, connection limits,
server behaviour and the caller's task structure can affect actual overlap;
measure a suspected bottleneck before changing the design.

Keep a service with its owning Feature while that location remains descriptive,
even if another Feature uses it—for example, launch-data providers may remain
beside the schedule Feature. Move a broadly applicable service such as generic
networking to a clearly named shared location when no one Feature naturally
owns it. AppModel may compose a shared dependency where common configuration or
shared state is needed; otherwise use the simplest value or instances that meet
the real requirements.

Reserve other infrastructure names for the service's actual job: `SettingsStore`,
`LocationClient`, `PurchaseService`, or a justified `LocationManager`. These
lower-level collaborators are not features merely because several features
use them. A shared collaborator may remain in its original owning feature
while that ownership stays clear; move it to a shared location only when the
first feature no longer naturally owns it. Do not rename existing apps solely
to satisfy this convention unless the requested work includes migration.

A concrete feature:

- exposes its domain methods and properties directly, without a feature protocol;
- owns business rules, validation, calculations, and classifications;
- coordinates repositories and lower-level collaborators for its workflow;
- publishes durable edits as saved only after their required persistence succeeds;
  a successful remote response need not wait for an optional local cache;
- may be used by several different ViewModels without sharing those ViewModels;
- hides its internal collaborators from callers;
- has methods named after their real action or result.

Repository and provider protocols may support actual production and test
implementations. Keep those substitution boundaries below the concrete feature;
they do not justify a second protocol around the feature itself.

Prefer:

```swift
func recordCoffeeToday() async throws
func refreshStoreState() async
func makeWeightEntryDraft(editing entry: WeightEntry?) -> WeightEntryDraft
```

Avoid:

```swift
func start()
func begin()
func prepareForUse()
func process()
```

Names must let a junior developer understand what will happen without knowing
the implementation or navigating through several nested objects.

Do not expose deep object graphs such as
`appModel.progress.snapshot.chart.points`. Expose the capability or result the
caller actually needs through a clear feature API.

## Keep Persistence Behind Repository Contracts

Features speak to repository protocols in domain language. They do not
know file paths, CloudKit record fields, HTTP routes, database tables, or cache
formats.

Repository implementations:

- isolate external systems;
- convert storage representations to and from domain values;
- protect mutable state using actors or another explicit isolation mechanism;
- define offline, retry, and synchronization behaviour;
- throw meaningful errors rather than silently inventing success.

For production SwiftData repositories with non-trivial reads, writes, imports,
or data sets, use a dedicated `@ModelActor`. It owns its `ModelContext`; Features
remain `@MainActor` and publish only immutable `Sendable` domain
values after awaiting the repository. SwiftData `@Model` records never cross
from the model actor into a feature, ViewModel, or View. A small,
deliberately UI-owned context may be main-actor isolated when its work is proven
short, but that is an exception—not the default commercial persistence design.

Publish user edits and other durable commands as saved only after the required
authoritative persistence succeeds. Keep an editable draft on failure and report
the error; do not present unsaved changes as saved. Loading and error
presentation may update independently.

For simple preferences, `UserDefaults.set` updates the process's in-memory
defaults immediately and writes to disk asynchronously; it does not report a
durable-write result. Update the defaults before publishing the preference,
but do not present the return from `set` as proof that the disk write succeeded.
If a product requires confirmed persistence and recoverable write errors, use an
appropriate storage API that provides those results instead. Apple documents
[UserDefaults write behaviour](https://developer.apple.com/documentation/foundation/userdefaults)
and says [`synchronize()` is unnecessary and should not be used](https://developer.apple.com/documentation/foundation/userdefaults/synchronize()).

A replaceable local cache of data already obtained from an authoritative remote
source is different: publish a successful, current response without waiting for
the optional cache write. Attempt caching independently, use a bounded retry,
and do not misrepresent an unsaved cache as available offline. A cache failure
must not turn the successful remote response into a failed download or discard
the data. Preserve an existing good cache when a replacement fails and prevent
older writes from overwriting newer snapshots. This exception does not apply to
user edits, purchases, reminders, or other changes that require a durable save.

For a real schedule Feature using cached provider data, inspect
[Next Rocket Launch's LaunchScheduleFeature](https://github.com/3DaysOfSwift/RocketLaunch-iOS-App-Swift-Concurrency/blob/3ecaa30c76428bd8a6f5db8fd5506b6c20b846f7/Swift%20Concurrency%20Project/RocketLaunch/2%20-%20AppModel/Features/Launch%20Schedule/LaunchScheduleFeature.swift).
Treat the linked implementation as a source to examine, not as proof that its
entire project conforms to every current rule.

For replaceable server data, a saved snapshot can provide a fast initial display
and limited offline access without introducing offline editing or a sync engine.
Use a JSON file as the understandable default when a simple cache is appropriate.
The Instant Loading binary snapshot technique is an advanced, opt-in approach
suited to a sufficiently stable format; its decoder must safely reject incompatible
or corrupt data. Help a developer apply it when requested, but do not propose it
as part of creating or migrating a project.
When the product needs both restoration and a fresh request, start them
independently rather than delaying the request for the optional cache. Publish
restored data only if a newer authoritative response has not already superseded
it. A missing, incompatible or unreadable optional snapshot must not block the
normal download; retain any existing valid in-memory data on refresh failure.
Choose caching and freshness behaviour according to the product's requirements.

Define what persistence success means. In a local-first application, a command
may succeed once data is durably stored on the device while remote
synchronization remains pending. Expose synchronization state separately; never
claim remote success when only the local write succeeded.

Do not add offline editing or cross-device synchronization to a new app by
default. When the product needs sync across a person's Apple devices, first
consider the system-managed option appropriate to the data: SwiftData with
CloudKit for compatible model data, or iCloud documents for document-based
content. Verify capabilities, deployment target, account availability, schema
constraints, conflicts and behaviour on real devices; system-managed sync is
not instantaneous or a replacement for local error handling. Do not put a
live SwiftData store in iCloud Drive as a substitute for CloudKit integration.
If the same item can be edited on multiple devices while offline, decide the
conflict outcome for that data: a latest version may suit a simple preference,
while user-created work may need both versions preserved or a user choice.
Do not assume the framework eliminates all product-level conflict decisions.

When the product instead requires synchronization with its own server, use
the server's contract and introduce a dedicated sync service when needed. If
offline edits are supported, durably save each edit and its pending-sync
metadata together before publishing it as locally saved. Preserve pending
changes across failures and restarts, make retries safe against duplication,
and apply a product-defined conflict and rejection policy. Report local saving
and server confirmation truthfully. Whether offline edits are allowed, how
conflicts are resolved, and what status the user sees are product decisions,
not universal CFA defaults.

When restoring a non-critical user preference, treat a missing or obsolete
recognised-format value as a compatibility case when the product defines a safe
default. For example, use the system appearance if a saved theme no longer
exists, without asking the user to intervene. Preserve the old value where
appropriate and replace it only through an intentional migration or a successful
user choice. Distinguish this from unreadable or corrupt storage and failed
writes, which remain errors; never apply a default to user records or other
important data as if they had been loaded or saved successfully. Test the
fallback, a known value, and genuine storage failures.

Never silently discard a business or persistence failure. Preserve user input
after a failed command and expose a recoverable error. `try?` is reserved for
explicitly best-effort work where failure has no business consequence, such as
an animation delay. Loading features expose meaningful idle, loading, ready,
empty, and failed states as appropriate. Retry behaviour must be intentional
and bounded.

## Make Concurrency Behaviour Honest and Visible

An `async` feature method is a testable unit of work. It is not itself a `Task`.
A `Task` represents the initiated lifetime of asynchronous work.

### Default: retained ViewModel tasks and shared completion

Each ViewModel retains a named handle for every unstructured `Task` it creates
by default. Use one handle per independently managed operation, or keyed handles
when independent records need independent work. Equivalent repeated button
actions reuse the existing execution rather than create another task. A
synchronous button-facing method returns the existing/new handle; asynchronous
callers and tests await that same handle's `value`. Do not create a new wrapper
task for every tap just to wait, or silently return from an async operation
while its requested work is still unfinished.

Install the handle before the first suspension. The following main-actor
ViewModel example returns the same handle for repeated refresh requests:

```swift
@discardableResult
func refresh() -> Task<Void, Never> {
    if let refreshTask { return refreshTask }

    let refreshTask = Task { [weak self, itemsFeature] in
        defer { self?.refreshTask = nil }
        await itemsFeature.refresh()
    }
    self.refreshTask = refreshTask
    return refreshTask
}
```

Clear the stored task after publishing its outcome, on success, failure and
cancellation, so a later request can start again. Cleanup from an obsolete
execution must not clear a newer handle. Task tracking and cancellation are
screen behaviour and must not accumulate in the View. The ViewModel still
exposes clear intent methods, and the Feature owns the underlying business
workflow and shared request policy. Framework-owned View `.task` and structured
child tasks retain their existing owners; do not manufacture stored wrapper
tasks for them. Document departures from the retained-task default with a
concrete lifetime requirement. Retaining a handle does not require cancelling
a durable save when its screen disappears.

A SwiftUI View must never store a `Task` handle in a stored property or in
`@State` so it can inspect or cancel that work later. Its custom ViewModel owns
the screen's explicitly created task lifetimes from the start.
The View continues to render the ViewModel's observable state and report user
intent; the ViewModel stores, replaces, or cancels the Task.

Other retained task lifetimes include:

- cancelling an obsolete progress calculation when a new range is selected;
- AppModel retaining an app-wide StoreKit transaction observer;
- sharing a Feature-owned refresh among callers from several scenes.

### Each Feature owns its overlapping-call policy

ViewModel protection is not enough: another screen, lifecycle callback or
Feature may call the same API. Each asynchronous Feature operation must define
its policy at the Feature boundary:

- **Share execution:** equivalent calls await one retained in-flight task and
  receive its outcome. Determine equivalence from the operation, its inputs and
  the intended product behavior: matching inputs alone do not make separate
  commands duplicates when each command must take effect.
- **Queue execution:** when every command must execute, admit calls to an
  explicit asynchronous sequential queue. Finish the whole operation, including
  suspension points, before starting the next admitted command. Each caller
  awaits its own outcome. Define cancellation, failure and cleanup so no waiter
  is lost and a failed command does not accidentally strand later commands.

These are the default policies. Reject-while-busy, latest-request-wins or
independent execution needs a documented product reason. Never discard a new
edit or return another record's result as duplicate suppression. Preserve
independent work instead of serializing the entire app. Actors and `@MainActor`
do not serialize whole operations across `await`; coordinate without blocking
threads. Keep queue admission separate from admitted internal work to avoid
an operation awaiting itself. A cancelled waiter must not accidentally cancel
shared work still needed by other callers.

Choose the lifetime deliberately:

- durable commands such as persistence normally continue after presentation
  disappears;
- a Feature-owned shared refresh normally continues when a screen leaves, even
  if that screen was its only current caller. Keep successfully downloaded
  data in the Feature for later use, and let equivalent future callers join the
  in-flight request. A departing screen may stop waiting without cancelling
  the Feature's refresh; choose a different policy only for a specific product
  or resource requirement;
- replaceable work such as searches, previews, and recalculations cancels when
  superseded;
- presentation-only work cancels when its screen disappears if continuing would
  have no value;
- long-lived observers are stored by the app-scoped owner and cancelled when
  that owner ends.

Cancellation is cooperative. Check cancellation before expensive work and
again before publishing its result. A cancelled older operation must never
overwrite newer state.

Prefer structured concurrency (`async let` or task groups) when child work
belongs to one parent operation. Use unstructured Tasks when the lifetime must
outlive the current call or be independently stored and managed.

Do not use `@unchecked Sendable` to silence a warning unless the type genuinely
maintains a documented thread-safety invariant. `Sendable` communicates safety;
it does not create safety. Prefer actor isolation, immutable value types, and
explicit task boundaries.

Do not change required concurrent behaviour into sequential behaviour simply to
make compiler diagnostics disappear or make code look easier. Code defines the
application's behaviour. Preserve independent startup and refresh operations as
independent work when the product requires them to begin together.

Main-actor isolation protects UI-observed state; it is not permission to perform
expensive work on the UI executor. File parsing, CPU-heavy calculations, image
processing, and blocking external work operate outside the Main Actor using
immutable `Sendable` inputs. Return to the Main Actor to publish the result.

Actors are reentrant across `await`. Revalidate assumptions after suspension.
When newer requests supersede older ones, use cancellation, operation identity,
or revision checks so stale work cannot publish over current state. Do not leave
observable state temporarily inconsistent across an `await` unless that
intermediate state is intentional and representable.

## Use Application Launch as an Opportunity to Refresh Features

### Mandatory: database availability must never gate the interface

**Opening a database is never a prerequisite for presenting the application's
interface.** Install the stable root navigation immediately, independently of
whether storage is unopened, opening, available, or failing. This is a CFA
architecture requirement, not a limitation of SwiftUI or SwiftData.

- Never gate `WindowGroup`, `ContentView`, a root tab/navigation View, or an
  app-wide blocking overlay on a container, database-ready flag, loading state,
  or storage error. Moving the condition into another root wrapper is still a
  violation. Initializers and `AppModel.live()` assemble dependencies; they must
  not open storage as a side effect before the root can be constructed.
- A Feature requests domain data through its storage capability.
  `SwiftDataManager` opens the shared store lazily within that request and
  reuses it after successful opening. Container/context details never escape
  the persistence boundary. A failed opening throws through the request just
  like a failed fetch; it is not an application launch failure.
- Before constructing a file-backed container, the storage owner explicitly
  prepares the parent directory at the configured store URL. Preserve existing
  locations and data; propagate directory failures rather than relying on
  framework recovery, deleting files or substituting another store. Follow the
  Swift coding guide's first-use storage preparation and persistence checks.
- The Feature owns the request outcome. Its dedicated screen ViewModel maps
  that outcome into presentation, and the feature screen shows loading, error,
  and retry UI. Preserve previously loaded data when a refresh fails; never
  report an unsuccessful initial fetch as a successful empty result.
- Retry repeats the domain request through the same Feature. The View does
  not reopen a database. If opening never succeeded, the storage owner can
  attempt it again; an ordinary failed fetch is not permission to discard a
  working container, delete user data, or substitute an empty in-memory store.
- Keep independent navigation and capabilities usable. Operations that really
  require unavailable data must still fail honestly; do not pretend they work.
  A necessary migration may delay affected data operations, never the whole
  application shell. There is no app-level `launchError`, `startupError`, or
  database-loading gate in AppModel, App, the delegate, or root navigation.

The failure route is:

```text
SwiftDataManager / repository throws from a data request
  → owning Feature records the request failure
  → screen ViewModel prepares user-facing information
  → feature screen renders the error and offers retry
```

**Acceptance check:** deliberately fail the first store-opening request and
verify that root navigation remains visible, the affected screen explains its
failed request, and an independent screen such as Settings remains reachable.
Then retry successfully and verify that the feature recovers without replacing
the root interface or losing previously saved data. Test failed refresh with
existing data separately. Compilation or a fake fetch alone does not verify
the real storage-opening and UI behaviour; report unexecuted checks explicitly.

### Keep the SwiftUI App entry point structural

The `App` type declares scenes, installs app-wide presentation dependencies,
and names one stable root View in each `WindowGroup`. Its `body` does not
branch on feature state, storage availability, launch progress, or errors. It
does not contain `if`/`switch` startup decisions, `ProgressView` or
`ContentUnavailableView` for database opening, a `ModelContainer` reference,
or a launch `.task`. Do not store `AppModel.shared` as an `@State` or other
property in the App. Keep the root screen identity stable while features load.

The root View (for example, `ContentView` or `RootTabView`) owns only the
application's navigation or tab structure. A feature screen below it owns
loading, empty, and error presentation through its dedicated ViewModel; the
Feature owns those outcomes and asks its `SwiftDataManager` to open storage.
Moving the same database-opening conditional from `App.body` into the root
navigation View is not a fix. The root is not a persistence coordinator.

```swift
WindowGroup {
    RootTabView()
        .environment(themeManager)
}
```

Construction must not silently trigger asynchronous side effects. Initializers
assemble valid objects; clearly named methods perform work.

The application lifecycle—not RootTabView—signals AppModel synchronously from
the earliest applicable launch callback:

```swift
func applicationDidFinishLaunching()
```

AppModel keeps one simple Boolean to ensure the method runs once. The app
delegate calls this synchronous method directly,
without wrapping the AppModel call in a Task. AppModel synchronously invokes
the Features' named startup methods and starts any app-wide listeners it owns;
each Feature owns any asynchronous tasks
needed for its refresh or local restoration. The delegate returns after those
startup methods have been invoked, not after their network or disk work has
finished. Call from `UIApplicationDelegate.application(_:didFinishLaunchingWithOptions:)`,
not a SwiftUI View or scene `.task`. Keep synchronous work brief, avoid blocking
network or disk I/O on the main thread, and measure launch and first-frame timing.
Do not store `AppModel.shared` in the App, delegate, View, or another object's
property. A local reference for a single call is fine. A ViewModel's defaulted
Feature dependency may read `AppModel.shared.<feature>` once at construction.
AppModel does not interpret success, combine failures, show errors, or decide
whether the user may enter a feature.

RootTabView is structural only: it presents tabs and navigation. It never starts
a feature refresh, interprets loading, or presents a feature failure. Each
feature screen owns that presentation through its own ViewModel.

A feature owns the current domain data and minimal operation state as
separate values. A network API returns domain data or throws an error. Do not
create a `LoadState` enum that carries repositories, error text, and operation
status together: it is a disguised result type that makes cached data and retry
behaviour needlessly difficult to model.

```swift
private(set) var repos: [Repo] = []
private(set) var isRefreshing = false
private(set) var refreshError: (any Error)?
```

`refresh()` is an explicit feature command. It may display a saved snapshot
while requesting newer data. When the server is authoritative and local storage
is only a replaceable cache, publish a successful current response without waiting
for the optional cache write; an older cache restore must not replace that response.
User edits that require durable storage follow the separate save-before-publish
rule. Reading a property must not secretly begin asynchronous work. A ViewModel
exposes these values as presentation-ready properties; its View shows loading,
failure, cached data, and retry for that feature.

Never use `.task { AppModel.shared.applicationDidFinishLaunching() }`
or an equivalent View-tied call to signal application launch. The app delegate
signals launch at the earliest applicable application lifecycle callback and
starts the shared system refresh concurrently with UI preparation.

A screen's `.task { await viewModel.refresh() }` is the normal, approved
choice for that screen's own initial asynchronous work: SwiftUI starts it
before the View appears. It does not guarantee that storage or network work
finishes before the first frame, so the screen must render an observed loading,
cached, empty, or error state while the work continues. Use the app lifecycle,
not a screen `.task`, for a shared refresh that must begin with launch or outlive
one screen.

When the launch lifecycle and one or more screen `.task` modifiers can request
the same Feature refresh, the Feature stores one in-flight `Task<Void, Never>`.
The first caller creates it; every later caller awaits that task's `value`.
They therefore receive the result of the same refresh rather than starting a
second request or returning before the first finishes. Derive `isRefreshing`
from the stored task and clear it with `defer` inside the task after publishing
its outcome. This task belongs to the Feature—not to the View task that first
requested it—because the shared refresh may outlive any one screen. A different
policy needs a documented product reason and dedicated tests.
Airplane Mode, a temporary API failure, unavailable iCloud, and lost
connectivity are legitimate user flows, not exceptional states to conceal.
Retrying asks the same feature to refresh again; the View does not
reproduce feature rules.

One feature failing must not prevent unrelated features from becoming usable.
If several scenes report application launch, AppModel's Boolean prevents
duplicate launch refreshes.

Individual features have no concept of an application launch unless
launch is genuinely part of that feature's domain. `DailyTipFeature.refresh()`
refreshes tips; it does not `beginLaunch()`. The lifecycle initiator names the
occasion; the Feature command names the work.

Tests directly test that the launch opportunity triggers the intended features
once without making AppModel responsible for their results. Each feature
has its own tests for successful refresh, failed refresh, retained cached data,
and retry.

Ordinary feature and ViewModel tests do not need to call application launch
unless the behaviour under test contractually depends on it.

## Keep Time and Other Volatile Dependencies Injectable

Business decisions involving the current date use an injected clock or date
function. Do not scatter `Date.now` through Views and ViewModels when the value
changes a business result.

Use a closure when production time must continue advancing:

```swift
let currentDate: @MainActor () -> Date = { .now }
```

Tests replace it with a fixed value. A stored `Date` is not a clock and becomes
stale. Views may use the current time solely for ephemeral visual presentation;
domain comparisons and date boundaries come from the feature layer.

Apply the same principle to randomness, identifiers, locale-sensitive business
rules, and external clients when deterministic tests require control.

Feature APIs should express date-relative business intent directly—such as
`todaysEntry`, `currentWeekSnapshot`, or `recordCoffeeToday`—instead of requiring
each ViewModel to obtain the date and reconstruct what “today” means.

## Use Observation Deliberately

For supported modern deployment targets, use `@Observable` rather than Combine
publisher plumbing for UI-readable reference state.

- Put `@Observable` on ViewModels and UI-observed features.
- Put ViewModels and all Features on `@MainActor`; a Feature without a current
  screen follows the same isolation convention.
- Own a ViewModel with `@State` in its View.
- Create an `@Bindable` projection only when a SwiftUI control requires a
  writable binding.
- Do not manually forward change notifications.
- Do not add `@Published`, `ObservableObject`, or Combine without a concrete
  compatibility or publisher-composition requirement.

A computed property does not emit an independent notification. SwiftUI tracks
the observable stored properties read while evaluating it. Ensure the computed
property reads observable feature state or expose a stored observable result
when it represents completed asynchronous work.

## Preserve One Authoritative Owner for Shared State

Every piece of shared mutable application state has one authoritative Feature
owner on the main actor. Persistence records and implementation caches are
representations used by lower-level services, not additional authorities for the
application's current business state. ViewModels expose, format, and temporarily edit that state;
they do not maintain competing copies that require manual synchronization.

The screen's ViewModel owns editable field values and other screen presentation
state, including unsaved drafts, selections, loading presentation and transient
errors. SwiftUI-specific state such as focus may remain in the View. A text-field
draft is not saved application state: retain it on save failure for retry and
discard it on cancellation. Persisted collections,
entitlements, synchronization status, and domain results belong to their feature.

Feature APIs expose state as read-only and provide named commands for mutation.
Views and ViewModels never mutate a feature collection directly. Every domain
mutation passes through the feature that owns its rules and persistence.

For paid capabilities, `PurchasesFeature` owns entitlement state. The screen's
ViewModel combines it with the relevant capability Feature and checks the
current entitlement before presenting or calling a paid capability; otherwise
it presents the appropriate locked or purchase experience. Apply this to every
relevant entry point, including alternative screens and other callers. Keep
pricing and purchase checks out of the capability Feature so its behaviour can
be reused as the product's pricing changes. Payment-provider services can be
owned by the purchase capability. Server-protected operations still require
server-side authorisation: a UI check is not a security boundary.

A CFA conformance audit must trace known paid capability entry points and flag
an established unguarded path with its source and consequence. First establish
which capabilities are paid from product requirements and entitlement policy;
do not infer a paid capability from a name alone. If an entry point, dynamic
dispatch or entitlement check cannot be resolved, report it as unverified rather
than claiming the check passed. Exercise locked and entitled outcomes and
relevant alternate entry points in behavioural tests.

## Separate Domain Decisions from Display Decisions

Features return semantic results and plain data snapshots. ViewModels
translate those results into the exact information their View needs. Views
render them.

For example:

```text
DailyTrendFeature: classifies the weight direction
TodayViewModel: exposes the classification and formatted screen values
TodayView: chooses the icon size and transition for that classification
```

A ViewModel may choose display wording or expose a presentation flag. It must
not recreate the classification rule. If another interface would need the same
answer, move the answer into the feature.

Charts receive prepared chart data. SwiftUI draws the chart, but the Model owns
filtering, ranges, projection, interpolation inputs, trend calculations, and
domain bounds. Geometry and visual scales belong to the chart View only when
they do not alter domain meaning.

## Test the Same Boundaries the Architecture Advertises

The test navigator includes these primary groups:

```text
View model tests
AppModel tests
Feature tests
```

Add persistence, integration, concurrency and support groups when the project
needs them; keep the named Feature and ViewModel test homes easy to find.

Rules for tests:

- every ViewModel has its own test file and suite;
- every concrete Feature has a named API test file under `FeatureTests`,
  including `SettingsFeatureTests.swift` in a new app;
- never create one shared test suite for several screen ViewModels;
- ViewModel tests inject an isolated feature capability;
- feature tests exercise business rules and workflow coordination;
- repository tests exercise persistence, synchronization, and failure behaviour;
- AppModel tests verify construction and application-wide coordination;
- async functions are awaited directly in unit tests;
- task cancellation and race-prevention behaviour receive dedicated tests;
- repeated actions and Feature calls share execution and completion when one
  execution satisfies them all; commands that must each take effect run in
  admission order with individual outcomes, even when their inputs match.
  Cover failure/cancellation cleanup and successful later retry;
- clocks, repositories, and external clients use deterministic test doubles;
- tests describe observable behaviour, not private implementation details.
- tests that need AppModel assemble an isolated graph and never alter the shared
  production instance;
- concurrency tests cover cancellation, stale-result prevention, reentrancy,
  and partial failure where those behaviours affect correctness.

Do not use UI tests as compensation for async work hidden inside untestable
ViewModel-owned Tasks. Keep feature commands async and directly awaitable.

## Prefer Readable Domain Language over Architectural Ceremony

Architecture exists to make behaviour easier to find and change. Do not add a
factory, router, lifecycle manager, coordinator, service locator, use-case type,
or protocol merely because such a type is fashionable.

Add a layer only when it owns a stable and explainable responsibility. Remove a
layer when its name is more substantial than its contribution.

Comments explain ownership, non-obvious trade-offs, concurrency invariants, and
why a decision exists. They do not narrate obvious syntax.

Commercial Views keep display strings localisation-ready, support Dynamic Type,
provide meaningful accessibility labels, and respect Reduce Motion. Domain
values are never stored as already-localised display strings.

The goal is that a junior developer can follow one clear sentence:

```text
The View reports an intention to its ViewModel; the ViewModel asks the relevant Feature;
the Feature applies the business rules and uses a Repository when data persists.
```

## Prohibited Patterns

Reject or refactor the following during review:

- business calculations, classifications, validation, or filtering in a View;
- reusable business rules in a ViewModel;
- one ViewModel shared by multiple unique screens;
- ViewModels stored by AppModel, a root ViewModel, or another ViewModel;
- Views receiving ViewModels, Features, AppModel, or repositories;
- screen Views receiving service closures or another screen’s ViewModel actions;
- ViewModels depending on the whole AppModel instead of the smallest coherent
  set of narrow feature APIs;
- features containing navigation, sheets, dialogs, or screen names;
- repositories imported directly by Views or ViewModels;
- deep chains through the AppModel object graph;
- default live dependencies hidden in `AppModel.init`;
- asynchronous side effects inside initializers;
- Task handles stored by a SwiftUI View;
- vague lifecycle or action names such as `start`, `begin`, `process`, and
  `prepareForUse`;
- speculative folders, layers, or abstractions;
- `@unchecked Sendable` used as a compiler-warning escape hatch;
- serializing independent work when the required behaviour is concurrent;
- unstructured Tasks whose lifetime or cancellation affects correctness but is
  not stored and managed;
- Combine observation added where the Observation framework is sufficient.
- competing copies of shared feature state in multiple ViewModels;
- feature APIs exposing directly mutable domain collections;
- domain types placed under storage merely because they are persisted;
- swallowed business or persistence failures;
- expensive or blocking work performed on the Main Actor.

## Review Checklist

Before accepting a change, answer every question:

1. Can the folder location alone explain which layer owns every new type?
2. Does every unique screen have its own adjacent ViewModel?
3. Is each ViewModel named `viewModel`, owned with `@State`, and released with
   its View?
4. Can every View be created without receiving a ViewModel, AppModel, Feature,
   or repository, and do screen Views avoid receiving another screen’s actions?
   Reusable presentation components may receive action closures.
5. Does every business decision live in a feature or lower Model layer?
6. Would an Apple Watch app be able to reuse the decision without copying UI
   code?
7. Does each ViewModel depend on the smallest coherent set of concrete
   Features needed by its screen?
8. Does AppModel assemble and expose Features, own app-wide listener tasks,
   and limit coordination to genuinely application-wide responsibilities?
9. Is persistence accessed through repository protocols, and are other
   external-system details handled by appropriate microservices?
10. Are async operations directly testable, with no Task handle stored by a
    View and every meaningful Task lifetime stored by its ViewModel or other
    correct owner?
11. Has required concurrency behaviour been preserved rather than simplified
    away?
12. Are time-dependent business rules deterministic in tests?
13. Does every ViewModel have its own focused test suite?
14. Can a junior developer read the names as plain English without learning the
    entire object graph first?
15. Was every new abstraction earned by a concrete responsibility?
16. Does each piece of shared state have one authoritative owner and mutate only
    through named feature commands?
17. Can every meaningful Task lifetime—durable, replaceable, presentational, or
    long-lived—be explained and managed appropriately?
18. Is expensive work kept away from the Main Actor while observable results
    return to it safely?
19. Are failures, partial loading, offline persistence, and retry behaviour
    represented honestly?
20. Are domain types stored with the feature that owns their meaning?

Every applicable answer must be yes. Marking a question not applicable requires
a short explanation. Otherwise, the change is not architecturally complete.
