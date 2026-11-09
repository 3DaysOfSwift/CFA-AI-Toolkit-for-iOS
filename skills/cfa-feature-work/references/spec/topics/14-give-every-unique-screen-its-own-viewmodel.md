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

**CFA screen ownership:** A screen owns its dedicated private ViewModel.
Name the screen’s ViewModel property `viewModel`. By default, construct it inline: `@State private var viewModel = HomeViewModel()`.
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

Name the screen’s dedicated ViewModel property `viewModel`, including in detail
Views. Construct it at the property declaration unless the selected-data detail
exception applies.

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

