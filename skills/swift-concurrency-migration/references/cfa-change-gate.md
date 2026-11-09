# CFA change gate

Use this gate before changing a CFA app. It is a short design pass and a final
structural review, not a line-by-line ceremony.

Read [project workflow and design authority](project-workflow.md) first.
Visual defaults are not architecture invariants; preserve approved product
designs unless the current request authorizes a change.

## Before implementation

Write down the affected route for every screen in scope:

```text
Screen View → Screen ViewModel → Feature → Microservices
```

`AppModel.shared` composes and exposes the Features; microservices include
providers, storage and device API adapters when needed.

For every proposed new or changed type, state: “This type owns …”. Confirm that
the responsibility is not already owned by an existing type.

Preserve these CFA invariants unless the developer explicitly asks to change
the architecture:

1. Each screen owns a dedicated ViewModel in a private property named `viewModel`.
   Construct it inline by default.
   A detail View may construct its own State-backed ViewModel in its initializer
   from selected value data. Never pass in or share a ViewModel.
   Previews use the same ownership and storage boundaries. A normal preview
   constructs the View, which creates its ViewModel and resolves its Feature
   through the normal default. Do not attach SwiftData to a View or preview.
2. ViewModels default narrow Feature dependencies from AppModel.shared; tests
   may provide isolated Features.
3. Preserve independent screen and scene selection in presentation, not shared
   Features. Selected detail data may be passed into the View.
   When a new app supports deep links or notification actions, its
   DeepLinkingFeature records received opening requests. Persist safe pending
   requests before confirming they are kept. Scheduling and delivery alone do
   not add an item. The receiving scene owns navigation, and concurrent attempts
   must not open the same request twice. Remove it after successful navigation
   or explicit dismissal. Declined, cancelled or failed navigation leaves it
   pending. Navigation succeeds when the destination opens, independently of
   whether its content has loaded. During migration, preserve existing
   deep-link, notification and history capabilities.
4. When the app uses `ThemeManager`, it is a presentation dependency supplied through the
   SwiftUI environment. AppModel and features are not environment
   values.
5. Features own feature state and behaviour; ViewModels own screen
   presentation state and route user intent to their feature. Published API
   or persistence snapshots use immutable `let` properties and contents, and
   are replaced after confirmed changes. Do not embed mutable reference state
   that undermines the snapshot; temporary editor drafts are presentation state.
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
9. Application launch begins at the application lifecycle boundary. The app
   delegate directly calls AppModel's synchronous `applicationDidFinishLaunching()`;
   AppModel uses a Boolean guard and synchronously invokes Feature startup methods.
   Features own their asynchronous work. Returning from the callback confirms
   startup was initiated, not that disk or network loading has finished.
   Keep synchronous startup brief and do not block on disk or network I/O.
   A screen `.task` starts screen-owned initial work with that View's lifetime;
   it is not a substitute for launch or a guarantee that loading finishes before
   the View appears. When both paths request an equivalent refresh, the Feature
   owns and shares the in-flight work, and callers await its outcome. Clear its
   retained handle after completion without letting older work clear newer work.
   A shared Feature refresh normally continues when a screen leaves, even if
   that screen was its only caller; keep the result for later use. A different
   cancellation policy needs a specific product or resource reason.
   A ViewModel retains a handle for each independently managed button action;
   equivalent repeated actions reuse that handle, which async callers can await.
10. A non-trivial SwiftData repository is a `@ModelActor`. Its `ModelContext`
    and SwiftData records stay inside that actor; it returns `Sendable` domain
    values to the main-actor concrete feature type.
11. Views remain declarative. Bundle/system reads and presentation formatting
    belong to the adjacent ViewModel; business, persistence, and shared state
    belong to the owning Feature.
12. A ViewModel initializer defaults its narrow Feature dependencies from
    `AppModel.shared`. A detail ViewModel may also receive selected value data;
    avoid unrelated convenience parameters.
13. Each local data responsibility uses the simplest single persistence route.
    A replaceable remote snapshot normally uses one JSON cache; SwiftData is reserved
    for genuinely structured, queryable, growing, or relational local data.
    Do not persist the same snapshot through both a database and a file cache.
    Publish durable user edits as saved only after required persistence succeeds.
    When both restoration and refresh are needed, start them independently.
    A missing, incompatible or unreadable optional cache must leave the download
    free to proceed. Publish current server data promptly, attempt caching
    independently, and prevent an older restore from replacing fresh results.
    Use JSON by default. Offer Instant Loading binary snapshots only on request
    for a sufficiently stable format with safe rejection of incompatible data.
    When a non-critical preference is missing or obsolete, use its
    product-defined safe fallback. Treat unreadable or corrupt durable storage
    and failed durable writes as errors. A fallback must never imply that user
    records loaded or saved successfully.
14. AppModel stores `shared`, concrete Features, one private launch Boolean,
    and private task handles needed to own app-wide listeners. Its explicit
    initializer assigns injected Features, sets the launch guard to false and
    initializes any app-wide listener task handles to nil;
    its single `static live()` constructs all production dependencies. No
    service, container, loading/error presentation state, or defaulted Feature
    property belongs in AppModel. AppModel starts and owns app-wide listeners
    and forwards events to the responsible Feature, which interprets them.
    Feature-owned background capabilities register their own handlers when
    needed; route system callbacks to them and honor expiration and completion.
    For additional device or extension targets, include the appropriate shared
    Model source and target-specific presentation. Each process has its own
    AppModel and Feature instances; synchronize data through an appropriate
    platform mechanism rather than assuming shared memory.
15. SwiftData access goes through `SwiftDataManager`; every `URLSession` call
    goes through `NetworkingManager`. Features own those lower-level
    collaborators. Views/ViewModels never open storage or make transport calls.
16. The app delegate's launch callback signals `applicationDidFinishLaunching`.
    No View `.task` performs app launch, and no App, delegate, or View stores an
    AppModel reference. ViewModels retain only the narrow Features needed by their screen.
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

20. Features represent business capabilities, independently of screens and tabs.
    A screen can present several independent business capabilities through its
    dedicated ViewModel; several screens may use the same Feature. Give each
    Feature a real responsibility and named tests, with one authoritative owner
    for shared business state. Do not invent a Feature to match a tab count.
    Features own authoritative application state on the main actor. Distinguish
    service-internal request tracking, caches and storage machinery from that
    business authority; do not promote all stateful helpers into AppModel.
    When account changes affect other Features, coordinate the real workflow
    explicitly. If sign-out fails before the session ends, retain account state;
    after success clear affected state and prevent old requests from republishing
    it. Reconcile partial authentication outcomes and handle cleanup failures
    honestly; preserve user-owned or unsynchronised work according to the product.
21. New-app visual starting points live in [new-app design defaults](new-app-design-defaults.md).
    Use them only where appropriate to the recorded workflow and current request;
    user-approved designs override defaults. Do not require palette counts or
    a popup theme selector when adopting CFA in an established product.
22. ViewModels retain handles for their created Tasks by default. Equivalent
    repeated actions reuse and await the existing execution, not a duplicate
    task or silent busy return. Each Feature operation independently shares
    equivalent in-flight work or queues commands that must each execute
    sequentially across suspension points. Record input identity, cleanup, cancellation and any
    product-required exception. Never lose a required edit as a duplicate, even
    when its input matches another command.

23. The branded Settings About/footer is a new-app default, not a CFA invariant.
    Existing apps receive it only on an explicit request such as “add CFA footer
    to Settings View”. Never repeatedly prompt or fail an ordinary tidy-up
    because themes, a footer or CFA branding are absent.

## Before delivery

Review the changed source as one feature slice, not as isolated files.
When the scope includes a paid capability, establish its entitlement policy and
trace every identifiable entry point to its guard. Flag established unguarded
calls and report unresolved paths as unverified. Test locked and entitled paths;
do not claim that UI gating replaces server-side authorisation.

## Migration progress and completion language

During a migration, default to reporting the next concrete milestone: for
example, **“Continuing migration: moving the Movies feature into the visible
CFA ownership structure.”** Do not use “migration complete”, “finished with
migration”, or equivalent whole-project language for a route-level refactor,
a source-only check, or a pre-change test baseline.

A route may be described as a **verified feature checkpoint** only after its
post-change build/tests and behaviour checks pass. It remains part of a
continuing migration until the agreed project scope is complete.

Before calling a CFA migration complete, capture a completion record that
identifies all of the following:

- the before/after Xcode navigator map, showing the agreed CFA folders and
  feature ownership visibly—not just source paths on disk. Reconcile temporary
  package placements and move files into their intended locations when safe;
  record intentional package boundaries or unresolved blockers, and verify
  target membership and affected builds after moves;
- the feature inventory, including every scoped tab or screen, its concrete
  Feature dependencies, dedicated ViewModel, composition owner, named tests, and any
  intentionally retained legacy boundary;
- a current concurrency inventory showing every scoped GCD, callback,
  OperationQueue, timer, lock, or delegate route as migrated or explicitly
  retained with a reason;
- the hybrid implementation review, identifying remaining users of legacy
  mechanisms and dependencies and recording which adapters were removed or
  intentionally retained to preserve behaviour or platform support;
- the final CFA audit across the agreed scope, including the resolution of
  actionable deviations and re-verification after corrections;
- post-change build and test results at the final commit, plus the relevant
  manual behaviour regression; and
- a human architecture review confirming that the navigator communicates the
  agreed structure.

If any item is absent, failed, or only inferred, say **“Continuing migration”**
and name the missing checkpoint. Record a failed pilot honestly and block it
from precedent use; do not reframe it as a completed partial migration.

- Where one execution satisfies equivalent ViewModel actions or Feature calls,
  verify those callers share its completion. Do not coalesce distinct commands
  that must each take effect. Verify queued commands execute in admission order
  and return their own outcomes. Test failure/cancellation cleanup and a later
  retry using controlled dependencies, not sleeps; record exceptions explicitly.

- For a shared refresh that should survive navigation, verify that it completes
  and keeps its result when its only screen waiter leaves. Also verify that
  cancelling one of several waiters leaves the other callers able to finish.
- Trace every affected screen to its ViewModel and required AppModel Features.
  Do not require a distinct Feature per tab or screen. Require named tests for
  each actual Feature; test shared data across screens without duplicating owners.
- For a growing ViewModel, ask: is it arranging existing capabilities for this
  screen, or implementing a new business capability itself? Only the latter
  points towards extracting business behaviour into the model. Keep presentation
  coordination in the presentation layer; dependency count alone is not a defect.
- Inventory screen initializers and call sites. Verify private ViewModel
  ownership and the `viewModel` property name separately. Allow selected-value
  detail initialization and reject ViewModel
  injection or shared screen and scene navigation selection in Features.
  Preserve independent destinations.
- Allow reusable presentation components to receive action closures that
  forward UI intent to their owning screen. Screen Views use their own
  ViewModel for work. Keep service closures and other screens’ ViewModel
  actions out of screen inputs.
- Compare visuals and interactions with the baseline. Do not introduce
  unrequested design changes or restore defaults the user replaced.
- For initial app design, verify the applicable new-app design defaults and
  user-approved alternatives: working icon, selected theme behaviour, Settings
  layout and system launch appearance. An explicit change to one of these in
  an established app does not opt into the others.
- For icon fixes, preserve artwork and target identity; new starter artwork
  requires new-app creation or an explicit request. Report unavailable visual
  checks accurately.
- Never introduce a timed splash or storage gate, regardless of visual design.
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
- Confirm repeated synchronous Button actions follow their intended policy:
  equivalent requests may reuse a ViewModel-owned task when one result satisfies
  every caller; distinct commands that must each take effect are admitted and
  coordinated without silently dropping presses. Async callers await the
  appropriate task's value.
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
