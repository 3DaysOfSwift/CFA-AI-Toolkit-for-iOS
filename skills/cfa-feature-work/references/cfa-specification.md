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

This architecture is offered as a practical gift to the iOS community. Its
consistent Xcode project structure gives developers a shared visual map of the
application and gives AI models strong, representative input. New features can
be added within a small, clearly owned area while communication with the rest
of the application remains explicit and coordinated. The goal is to improve
future code generation without sacrificing the readability and maintainability
required by the people who will own the code afterwards.

## Swift coding standards

Read and apply the [Swift coding guide](swift-coding-guide.md). It defines the common rules for all toolkit workflows: deliberate crash decisions, target-independent model logic, declarative Views, simple design, honest errors, explicit concurrency, responsive loading and evidence-based testing. The guide is maintained alongside this specification and bundled with every skill.

## Project Identity

For a new application, use the developer’s organisation prefix and a bundle-safe
app name. Ask for the prefix if it is not supplied; for disposable examples use
`com.example.<AppName>`. Test targets append their target name. Never change an
existing bundle identifier without an explicit request.

The original 3 Days of Swift Concurrency projects use
`com.3DaysOfSwiftConcurrency.<AppName>` as their organisation convention. It is
not a requirement of CFA or a default for other developers.

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
Feature API
  ↓
Feature
  ↓
Repository
  ↓
External System
```

User intent moves down through the layers and state or results flow back up. A
View reports intent to its ViewModel, the ViewModel requests a capability from
the Feature API, the concrete Feature applies the application's rules, and the
Repository interacts with storage, a server, or a device API.

Keep this route short, but never bypass an established owner for convenience.
Doing so places knowledge in the wrong type: a View begins to understand
persistence, a ViewModel duplicates business rules, or a Repository decides
application behaviour. Do not add layers for their own sake; use the fewest
layers needed while keeping every responsibility clear, testable, and easy to
find.

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

For **newly generated apps**, include a branded About section at the bottom of
Settings by default. Reuse the app's existing wordmark or logo when supplied;
otherwise display its actual app name with clear typographic emphasis. Do not
copy another app's branding. Include an Architecture row labelled
**CFA iOS Architecture** and the supporting sentence
**Built with Cooperative Feature Architecture.** This identifies the engineering
approach, not an independent certification or a guarantee of bug-free software.

Describe only capabilities verified in the generated app. Mention SwiftData
when it is used, distinguish local storage from synchronisation or remote
services, and describe AI as on-device only when its inference actually runs
there. Omit the AI row when there is no AI. Never infer a privacy promise from
the choice of database; account for cloud sync, analytics and external services.

Below the About card, outside all cells, use a table/section footer containing
a short app-specific description and a separate centred
`Version <marketing version> (<build number>)` line. Read the actual bundle
metadata; never hard-code a release number or invent one when missing.
Use an honest placeholder for unavailable metadata. Keep text readable across
themes and Dynamic Type, allow long names/values to wrap, and keep the footer
clear of the tab bar. The existing Settings ViewModel owns presentation
formatting; this does not justify another Feature or a database request.

For **existing apps**, this is opt-in, not an adoption or tidy-up requirement.
The explicit request **“add CFA footer to Settings View”** (or equivalent
consent) enables this focused change. Do not repeatedly ask, add it during
ordinary cleanup, or treat its absence as a failure. Preserve existing branding,
legal/privacy information and About content; merge rather than duplicate when
the user requests it. A focused footer request does not authorize unrelated
tidy-up passes. Check that the app uses CFA before describing it as CFA.

**Review:** Verify metadata formatting and missing-value handling, truthful
technology descriptions, branding, footer placement, large text and contrasting
themes. Record unavailable visual checks separately from source/build checks.

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

Every new iOS app project must have a working initial app icon before delivery,
so its Simulator installation does not display an empty icon. Use supplied
product artwork when available; otherwise use the existing CFA App template's
`CFA-App-Icon.png` and its `AppIcon.appiconset/Contents.json`. Reuse that artwork,
not the toolkit's plugin logo and not a newly generated substitute.

Creation, architecture adoption, concurrency migration and tidy-up must inspect
each in-scope iOS app target's icon. An empty `AppIcon.appiconset`, a missing
referenced image or an unconfigured target does not meet this requirement.
Preserve existing custom artwork, alternate icons and valid appearance variants.
If artwork exists but its wiring is broken, repair the wiring rather than
replace the artwork. If no usable icon exists, install the CFA starter icon
into the existing asset catalog and configure the target to use it.

Set `ASSETCATALOG_COMPILER_APPICON_NAME` to the actual icon set name for the app
target's build configurations. Verify catalog target membership, referenced
image files and dimensions, then build and check the installed app icon on the
Simulator Home Screen when available. Do not erase app data to refresh an icon.
Report any unverified Simulator check; file presence alone is not visual proof.
Missing optional dark/tinted variants do not make a valid base icon missing.
Do not change bundle identifiers, unrelated targets or existing branding.

The canonical starter asset lives in the CFA App Xcode template's
`Source/Assets.xcassets/AppIcon.appiconset`. The creation, adoption, migration
and tidy skills bundle the same asset at `assets/AppIcon.appiconset` so this
rule also works without a toolkit checkout. This check is mandatory independently
of optional theme work; a read-only review reports gaps without changing files.

### Strict No File Dumping Policy

Do not create vague dumping-ground folders such as `Helpers`, `Utilities`,
`Services`, `Common`, or `Managers`. Every folder must describe the specific
responsibility of the files it owns. If a file has no obvious destination,
clarify its responsibility rather than hiding it inside a generic collection.

### Colour Theme

Create a dedicated `ThemeManager.swift` alongside `AppColourTheme.swift` in
`1 - View/Theme`. The application owns exactly one observable ThemeManager and
supplies that same instance to every screen, scene, and presentation. Do not
construct separate managers in individual screens or place this presentation
state in AppModel.

Every new CFA app ships seven distinct, complete colour palettes, including at
least one light and one dark palette, plus an **Automatic** selection. Automatic
is a mode, not an eighth palette: it follows the system appearance using one
named default light palette and one named default dark palette. It is the
default for a fresh installation or an unknown saved identifier. A manual
choice stays selected when system appearance changes; returning to Automatic
follows the system again. Persist the mode, not its last resolved palette.

ThemeManager owns the current selection and exposes its palette. Every screen and shared component
uses that current palette for semantic colours: backgrounds, surfaces, text,
secondary text, accents, button foregrounds, and feedback. Keep palette literals
centralized. Deliberately fixed artwork colours can remain stable, but must not
be used as a substitute for themed interface colours.

Use `tint` for the interactive accent colour and `colorScheme: ColorScheme?`
for the light/dark appearance preference (`nil` for Automatic). Name the
contrasting foreground drawn over the tint `onTint`. Keep `theme` for the
complete palette, not just its appearance preference. The call sites read
`.tint(theme.tint)` and `.preferredColorScheme(theme.colorScheme)`, matching
SwiftUI terminology without renaming the framework modifiers.

Add a colour-theme selector to Settings using a native popup menu. A labelled
row shows the current choice and opens the choices when tapped. Use SwiftUI
`Picker` with explicit `.pickerStyle(.menu)`, or a native `Menu` containing a
selection-aware Picker. Show names and a selected-state checkmark; swatches
alone are insufficient. Never use a horizontal tab bar, segmented control, or
horizontally scrolling swatch strip to select themes. This restriction does
not prohibit the app's navigation `TabView`. Support VoiceOver, Dynamic Type
and comfortable touch targets. Selection applies immediately without Save.

Changing it must update visible and subsequently presented screens immediately.
Persist a stable theme identifier
across launches, with a default fallback for a missing or obsolete identifier.
Make system appearance, navigation, lists, text inputs, and sheets agree with
the selected palette; do not force light mode for a dark theme. Declare any
required privacy-manifest reason for the chosen preferences API.

In Automatic, leave the preferred colour scheme unset and respond to actual
system appearance changes while the app is open. Apply manual overrides to
native controls and sheets consistently; do not mistake a forced scheme for
the system preference.

Verify all seven palettes on the main user journey and in Settings, including
contrast, selection persistence, and newly opened sheets. Test Automatic in
both appearances, live system changes, manual overrides, returning to Automatic,
and missing/obsolete saved identifiers. Keep the themes and manager in
`1 - View`, because they own presentation rather than application behaviour.

Creation follows this policy from the start. Adoption and migration inventory
palette identifiers, saved choices, default mappings and selector behaviour.
Apply the policy when appearance is in scope; preserve recognised saved choices
and record intended UI changes in the behaviour contract. A narrowly scoped
unrelated migration reports the gap rather than silently redesigning the UI.

### System Launch Appearance

Every new CFA app supplies a minimal system launch screen with a named
`LaunchBackground` asset containing light (Any Appearance) and dark variants.
Use the default light and dark palette backgrounds so Automatic transitions
naturally into the first screen. The system launch screen always follows the
device appearance, not the saved in-app theme. Do not force `UIUserInterfaceStyle`
to make it match a manual theme selection. Keep manual in-app themes available.

Configure the native launch screen in the app target; it is not a SwiftUI View
and cannot consult ThemeManager or saved preferences. Do not add a timed splash,
database gate, or loading overlay to prolong it. Keep launch resources in
`3 - App Resources` and colour variants in the app's existing asset catalog.
Verify the built launch resource and both appearances, including a saved app
theme that differs from the device. Keep palette changes and launch colours in
sync. Apply this policy to new templates and appearance-scoped migrations.

### Swift Extensions

Keep SwiftUI-specific extensions in `1 - View/SwiftUI Extensions`. Place
reusable extensions of Swift or Foundation types in `4 - Swift Extensions`.
This makes it immediately clear whether an extension belongs to presentation
or can be used throughout the application. Name a general extension after the
type and capability it adds, such as `Date+StartOfWeek.swift`.

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

A small reusable View that only renders plain display data may remain stateless
and need no ViewModel. Examples include a chart receiving chart data, a streak
banner receiving a snapshot, or a reusable card receiving strings and colours.
It must not acquire feature access or business behaviour.

### Keep SwiftUI View Construction Fast

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

    init(viewModel: CoffeeTrackingViewModel) {
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
creates it at the property declaration.

The ViewModel initializer must also be quick and free of work-starting side
effects. It may retain the feature capabilities it needs from `AppModel.shared`,
but loading and other asynchronous work begin only through an explicit method.
`@State` associates the ViewModel with the screen's SwiftUI identity so the same
logical screen continues to observe its existing ViewModel across redraws.

Apart from plain input data, SwiftUI presentation state, environment-provided
presentation values, and this `viewModel`, do not make a screen View the owner
of long-lived reference objects. The View describes and reflects state; it does
not become an object-lifetime coordinator.

A ViewModel:

- is named after exactly one View;
- uses `@MainActor` and `@Observable` when it exposes UI-observed state;
- is created and owned by its View using `@State`;
- accepts only its narrow owning Feature in its initializer, defaulted
  from `AppModel.shared`; it does not accept bundle metadata, URLs, defaults,
  services, or other convenience presentation inputs;
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
- owns screen-specific error text, loading state, drafts, and presentation state;
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

1. Every screen-level View owns one dedicated `@State` ViewModel created at its property declaration.
2. Each ViewModel initializer defaults its narrow live feature dependency from `AppModel.shared` while allowing tests to supply an isolated replacement.
3. A screen View initializer does not receive `AppModel`, a feature, repository or ViewModel from its caller.

Do not remove a screen ViewModel, or pass feature dependencies through a screen initializer, merely because a generic architecture guideline would use fewer types. CFA makes the ViewModel boundary explicit so every screen has one clear, testable route into the shared application graph.

Most screens need one feature API. A screen may legitimately need more—for
example, a habits screen may read both habits and purchase entitlement state.
Do not invent an artificial facade merely to meet a numerical rule. If the set
keeps growing, reconsider the screen responsibility or introduce one cohesive
feature workflow below the ViewModel boundary.

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

A destination may receive a plain, immutable domain value that identifies what
it displays or edits. A stateless presentational component may receive a display
struct, such as chart points. Inputs must be data—not access to the application
graph.

Each screen owns the sheet, alert, or navigation destination it presents. Do
not create an application-wide router merely to move local presentation state
away from the View.

## Give Every App Tab Its Own Feature

In a tab-based CFA app, every top-level app tab has a distinct concrete Feature
exposed by AppModel. For example, Today, Habits and Settings map to
`TodayFeature`, `HabitsFeature` and `SettingsFeature`, with matching
`todayFeature`, `habitsFeature` and `settingsFeature` properties. Each tab's
screen ViewModel requests its own Feature. This is a CFA project-structure rule,
not a requirement imposed by SwiftUI.

Inventory the actual tab destinations before creation or migration. Record each
route as Tab → screen → dedicated ViewModel → AppModel Feature → named Feature
tests. Correct a missing tab Feature; having three arbitrary Features does not
satisfy a three-tab app. Additional non-tab Features are allowed. A system More
overflow item or a toolbar action is not a separate application tab.

Give each tab Feature a real domain responsibility, not an empty marker or a
copy of another Feature. Today owns daily progress and completion behaviour;
Habits owns the habit collection and its persisted mutations. They cooperate
through an explicitly injected dependency constructed in `AppModel.live()`.
The Today Feature reads the same Habits Feature instance; it does not copy its
collection or open another database. Keep dependencies directional and avoid
cycles. No tab-selection state, navigation, ViewModel, or matching FeatureAPI
protocol belongs inside these Features.

Creation and migration must verify this mapping in source and provide one
named test file per tab Feature. Test cross-tab consistency when tabs share
data. Nested screens may reuse their owning tab's Feature while retaining
their own ViewModels; do not invent one Feature per reusable View.

Tabs are a useful ownership map, not the only reason to create a Feature.
Separate capabilities with different responsibilities even when they share
data: habits can exist without streaks. `HabitsFeature` owns habits and recorded
activity; `DayStreakFeature` depends on it to interpret that history as current
and longest streaks. The dependency must not point back from Habits to Day
Streak, and streak calculations do not belong on the base Habit model. Such a
Feature can later gain its own tab without moving its rules into the UI.

## Use AppModel as the Composition Root and Feature Facade

`AppModel.shared` is the one production application graph. This is an explicit
architectural decision, not an accidental global variable.

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

AppModel's stored properties are exactly one `static let shared = AppModel.live()`,
the concrete Feature references, and one private Boolean guarding launch. No
other stored state belongs here: no service, repository, `ModelContainer`,
startup error, loading flag, navigation state, or presentation text. A failed
feature load is retained and presented by that Feature and its screen ViewModel.
The singleton guarantees shared access to the application graph; it does not
create thread safety. Actor isolation and immutable values do that.

Tests construct isolated application graphs and never mutate
`AppModel.shared`. Previews inject isolated feature implementations when they
need controlled state. Multiple production scenes use the shared graph so they
cannot accidentally disagree about persisted application state.

Do not give AppModel every function in the application. It is a facade over
coherent features, not a god object. A command concerning one feature
belongs on that feature's API and concrete implementation.

Do not hide production dependency construction in default initializer values.
`AppModel.init` is fully explicit and only assigns its supplied Features and
initialises the private launch guard to `false`; it does not construct or
resolve dependencies. No AppModel stored property has a default value except
`shared`. Exactly one `static func live() -> AppModel` constructs the live
services, repositories, and Features and passes only Features to `init`.
Tests construct isolated graphs by passing test Features to that same explicit
initializer. `live()` may use local lower-level values, but never retains or
exposes them as AppModel properties.

## Organize Behaviour into Cohesive Features

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
by a test double.

Use a `SwiftDataManager` whenever the app uses SwiftData. It owns container and
context creation/opening and hands a narrow storage capability to the owning
Feature. A Feature may ask it to load or save; neither AppModel nor any View or
ViewModel opens a database or handles a `ModelContainer`. Keep SwiftData
records and contexts inside the persistence boundary; preserve actor isolation.

Use a `NetworkingManager` whenever the app makes network requests. It owns
`URLSession` and wraps every session call; feature-specific API adapters decode
responses and provide domain-oriented operations. AppModel may construct this
manager as a local inside `live()`, but stores and exposes only Features.

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
- publishes shared feature state after successful persistence;
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
or data sets, use a dedicated `@ModelActor`. It owns its `ModelContext`; feature
features remain `@MainActor` and publish only immutable `Sendable` domain
values after awaiting the repository. SwiftData `@Model` records never cross
from the model actor into a feature, ViewModel, or View. A small,
deliberately UI-owned context may be main-actor isolated when its work is proven
short, but that is an exception—not the default commercial persistence design.

Feature state becomes authoritative only after persistence succeeds unless the
feature explicitly defines optimistic behaviour and rollback.

Define what persistence success means. In a local-first application, a command
may succeed once data is durably stored on the device while remote
synchronization remains pending. Expose synchronization state separately; never
claim remote success when only the local write succeeded.

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
- retaining a long-lived StoreKit transaction observer;
- ensuring several scenes await the same launch workflow.

### Each Feature owns its overlapping-call policy

ViewModel protection is not enough: another screen, lifecycle callback or
Feature may call the same API. Each asynchronous Feature operation must define
its policy at the Feature boundary:

- **Share execution:** equivalent calls await one retained in-flight task and
  receive its outcome. Define equivalence by operation and relevant inputs.
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

The first few seconds after launch are a valuable opportunity. The application
lifecycle—not RootTabView—tells AppModel that launch completed:

```swift
func applicationDidFinishLaunching() async
```

AppModel keeps one simple Boolean to ensure the method runs once. It does not
store a Task handle. The app delegate creates the launch Task and awaits this
method; AppModel then awaits the required feature refreshes. Call it from the
earliest applicable application lifecycle callback, such as
`UIApplicationDelegate.application(_:didFinishLaunchingWithOptions:)`, not a
SwiftUI View or scene `.task`. A synchronous delegate callback may create one
Task to enter the async method; the callback itself is the launch signal.
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

`refresh()` is an explicit feature command. It may first publish saved
data from SwiftData, then request newer data, update storage, and publish the
confirmed current data. Reading a property must not secretly begin asynchronous
work. A ViewModel exposes these values as presentation-ready properties; its View
shows loading, failure, cached data, and retry for that feature.

Never use `.task { await AppModel.shared.applicationDidFinishLaunching() }`
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
- Put those types on `@MainActor` when their state is read by SwiftUI.
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

Every piece of persisted or shared feature state has one authoritative owner:
its feature. ViewModels expose, format, and temporarily edit that state;
they do not maintain competing copies that require manual synchronization.

ViewModel-owned drafts, selections, focus, loading presentation, and transient
errors are permitted because they belong to one screen. Persisted collections,
entitlements, synchronization status, and domain results belong to their feature.

Feature APIs expose state as read-only and provide named commands for mutation.
Views and ViewModels never mutate a feature collection directly. Every domain
mutation passes through the feature that owns its rules and persistence.

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

The test navigator contains two primary groups:

```text
View model tests
AppModel tests
```

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
- repeated equivalent ViewModel actions and Feature calls share one execution
  and completion; queued commands run in admission order with individual
  outcomes, including failure/cancellation cleanup and successful later retry;
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
The View reports an intention to its ViewModel; the ViewModel asks one Feature;
the Feature applies the business rules and uses a Repository when data persists.
```

## Prohibited Patterns

Reject or refactor the following during review:

- business calculations, classifications, validation, or filtering in a View;
- reusable business rules in a ViewModel;
- one ViewModel shared by multiple unique screens;
- ViewModels stored by AppModel, a root ViewModel, or another ViewModel;
- Views receiving ViewModels, features, AppModel, or service closures;
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
4. Can every View be created without receiving a ViewModel, AppModel, feature,
   repository, or behavioural closure?
5. Does every business decision live in a feature or lower Model layer?
6. Would an Apple Watch app be able to reuse the decision without copying UI
   code?
7. Does each ViewModel depend on the smallest coherent set of narrow,
   replaceable feature APIs?
8. Does AppModel only assemble and expose features or coordinate a genuinely
   application-wide workflow?
9. Are persistence and external-system details behind repository contracts?
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
