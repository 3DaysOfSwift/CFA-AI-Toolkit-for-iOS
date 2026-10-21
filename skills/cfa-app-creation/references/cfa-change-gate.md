# CFA change gate

Use this gate before changing a CFA app. It is a short design pass and a final
structural review, not a line-by-line ceremony.

## Before implementation

Write down the affected route for every screen in scope:

```text
Screen View → Screen ViewModel → AppModel.shared feature → provider / storage
```

For every proposed new or changed type, state: “This type owns …”. Confirm that
the responsibility is not already owned by an existing type.

Preserve these CFA invariants unless the developer explicitly asks to change
the architecture:

1. Every screen-level View has one adjacent, dedicated ViewModel created by the
   View with `@State`.
2. Each ViewModel defaults its narrow live feature dependency from
   `AppModel.shared`, while tests can provide an isolated replacement.
3. Screen View initializers do not receive AppModel, features,
   repositories or ViewModels.
4. `ThemeManager` is an app-wide presentation dependency supplied through the
   SwiftUI environment. AppModel and features are not environment
   values.
5. Features own feature state and behaviour; ViewModels own screen
   presentation state and route user intent to their feature.
6. RootTabView is structural only. It presents tabs and navigation; it does not
   refresh features, interpret feature failures, or own feature loading state.
7. Every concrete feature type ends in `Feature`, such as `SettingsFeature`.
   Its AppModel property, ViewModel dependency, initializer label, and local
   reference use the matching lower-camel-case name, such as
   `settingsFeature`. The ViewModel depends on that concrete feature;
   do not add a matching `FeatureAPI` protocol. Inject a fake
   repository or provider into the concrete feature instead. Reserve
   infrastructure names for lower-level services;
   do not call a feature owner a `Manager`.
8. API operations return domain data or throw. Features keep domain
   data, operation state and retained errors as separate values; no result-like
   `LoadState` enum may carry all three.
9. Application launch begins at the application lifecycle boundary. AppModel's
   `applicationDidFinishLaunching()` uses a Boolean guard and awaits feature
   refreshes without storing a Task handle. The app delegate starts an app-wide
   refresh at the earliest launch callback, without blocking UI preparation.
   A screen `.task` starts screen-owned initial asynchronous work before that
   View appears; it is not a substitute for launch. When both paths request the
   same refresh, a shared Feature retains one in-flight `Task<Void, Never>` and
   every caller awaits its value; it clears the task in `defer` after publishing
   the outcome. A ViewModel retains one Button-triggered interaction task and
   returns it from `refresh()`; repeated Button presses reuse it and async
   callers await its value.
10. A non-trivial SwiftData repository is a `@ModelActor`. Its `ModelContext`
    and SwiftData records stay inside that actor; it returns `Sendable` domain
    values to the main-actor concrete feature type.
11. Views remain declarative. Bundle/system reads and presentation formatting
    belong to the adjacent ViewModel; business, persistence, and shared state
    belong to the owning Feature.
12. A ViewModel initializer accepts only its narrow feature dependency, defaulted
    from `AppModel.shared`. UI data is exposed by that feature and read through
    the ViewModel; do not add convenience initializer parameters.
13. Each local data responsibility uses the simplest single persistence route.
    A replaceable remote snapshot uses one JSON cache; SwiftData is reserved
    for genuinely structured, queryable, growing, or relational local data.
    Do not persist the same snapshot through both a database and a file cache.
14. AppModel stores only `shared`, concrete Features, and one private launch
    Boolean. Its explicit initializer assigns injected Features and the guard;
    its single `static live()` constructs all production dependencies. No
    service, container, loading/error presentation state, or defaulted Feature
    property belongs in AppModel.
15. SwiftData access goes through `SwiftDataManager`; every `URLSession` call
    goes through `NetworkingManager`. Features own those lower-level
    collaborators. Views/ViewModels never open storage or make transport calls.
16. The app delegate's launch callback signals `applicationDidFinishLaunching`.
    No View `.task` performs app launch, and no App, delegate, or View stores an
    AppModel reference. ViewModels retain only their narrow Feature.
17. The SwiftUI `App.body` declares a stable root View and app-wide presentation
    modifiers only. No startup `if`/`switch`, storage gating, database loading,
    feature error display, or AppModel property belongs there. The root View
    manages navigation only; feature screens present their own state.
18. Database availability never gates the interface, including root wrappers
    and app-wide blocking overlays. Construct the root independently of storage;
    open storage lazily inside a Feature's data request. Opening failures follow
    the request's error path through Feature → ViewModel → feature screen,
    never a launch/startup error. Retry the domain request, preserve saved data,
    and keep independent navigation usable.
19. ViewModel methods name the work they perform, not the UI gesture or
    lifecycle signal that triggered it. Use `refresh()`, `save()` or `retry()`;
    never `refreshTapped()`, `savePressed()` or `screenAppeared()`.

20. Every top-level app tab has its own concrete Feature exposed by AppModel
    and used by the tab's dedicated ViewModel. Give it a real responsibility
    and named tests. Cooperating tab Features share one authoritative data
    owner, never competing collections or independent copies of the store.
21. New apps provide seven complete palettes plus Automatic with named default
    light/dark palettes. Settings opens a native popup theme menu, never
    horizontal theme tabs or a segmented control. Follow the specification's
    Colour Theme policy and preserve recognised saved choices during migration.
22. ViewModels retain handles for their created Tasks by default. Equivalent
    repeated actions reuse and await the existing execution, not a duplicate
    task or silent busy return. Each Feature operation independently shares
    equivalent in-flight work or queues distinct calls sequentially across
    suspension points. Record input identity, cleanup, cancellation and any
    product-required exception. Never lose a distinct edit as a duplicate.

23. Newly generated apps include the specification's branded Settings About
    section and CFA footer, with truthful storage/AI details and bundle-derived
    version/build outside cells. Existing apps receive it only on explicit
    request, such as “add CFA footer to Settings View”; never repeatedly prompt
    or fail an ordinary tidy-up because the footer is absent.

## Before delivery

Review the changed source as one feature slice, not as isolated files.

- Verify repeated ViewModel actions and equivalent Feature calls share one
  execution and completion. Verify queued commands execute in admission order
  and return their own outcomes. Test failure/cancellation cleanup and a later
  retry using controlled dependencies, not sleeps; record exceptions explicitly.

- Trace every affected screen to its ViewModel and default AppModel feature.
- For a tab-based app, map every top-level app tab to a distinct concrete Feature
  exposed by AppModel and requested by that tab's ViewModel. Require its named
  Feature tests; test shared data across tabs without duplicating state owners.
- Confirm that no screen initializer gained dependency plumbing.
- For creation, migration/adoption and tidy-up, verify each in-scope iOS app
  target has a populated and correctly configured app icon. Preserve custom
  artwork; repair its wiring when needed. When no usable icon exists, use the
  bundled CFA App starter icon. Check the installed Simulator Home Screen icon
  when available and report verification limits. This is not optional theme work.
- For creation or appearance changes, verify seven palettes plus Automatic,
  popup selection, persistence, live system changes, manual overrides and
  returning to Automatic. Check sheets, contrast and accessible touch targets.
- Verify the native launch screen uses the default light/dark background assets
  according to device appearance, independently of a manual in-app theme. Check
  that its resource is built into the app and no splash delay or storage gate
  was introduced.
- Inspect every newly created or moved Swift file for the imports required by
  its own declarations; imports in another source file do not satisfy this.
- Confirm that every new screen and feature has the appropriate named
  test file under View Model Tests and Feature Tests.
- Confirm that launch refresh logic is absent from RootTabView and feature
  screens use `.task` for their own initial work—not as a substitute for
  application launch. Confirm the app delegate starts each shared system
  refresh at launch without gating or delaying the root UI.
- When launch and screen refresh can overlap, confirm callers await the one
  Feature-owned in-flight task rather than duplicate the request or silently
  return; test its success, failure and reset after completion.
- Confirm a repeated synchronous Button action reuses its ViewModel-owned task
  rather than creating a new `Task` per press; its async callers await the
  returned task's value.
- Read the App `body`: it must install a stable root without branching on
  storage, loading, or errors. Do not merely move that branch into RootTabView.
- For persistence changes, fail the initial store open and verify the root stays
  visible, the affected feature shows its request error, and Settings or another
  independent screen remains reachable. Verify successful retry and retained
  data after failed refresh. Report any storage/UI checks that did not run.
- Confirm that cached domain data remains representable while a refresh runs or
  fails, and that concrete feature types and their AppModel properties retain
  the `Feature` suffix.
- Inspect AppModel's stored properties, initializer, and `live()`; then search
  for `AppModel.shared` stored elsewhere, View-tied launch calls,
  `ModelContainer` outside the storage boundary, and direct `URLSession` calls.
- Confirm that storage work does not leak SwiftData `@Model` objects across an
  actor boundary, and that a `@ModelActor` is used where database work is not
  deliberately small and UI-owned.
- Remove abandoned files, duplicate state owners, placeholder naming and
  speculative abstractions created during the change.
- Build and run focused tests when available. Report an unavailable runtime or
  toolchain honestly; do not turn missing verification into a pass.

If any invariant fails, correct the plan before expanding the implementation.
