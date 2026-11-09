# CFA change gate

Use this gate before changing a CFA app. It is a short design pass and a final
structural review, not a line-by-line ceremony.

Read [project workflow and design authority](project-workflow.md) first.
Visual defaults are not architecture invariants; preserve approved product
designs unless the current request authorizes a change.

## Before implementation

Write down the affected route for every screen in scope. For SwiftUI screens,
use this map:

```text
Screen View → Screen ViewModel → Feature → Microservices
```

`AppModel.shared` composes and exposes the Features; microservices include
providers, storage and device API adapters when needed. For an existing UIKit
screen in a migration, map its actual presentation owner to the Features and
services it uses. Preserve the existing UI within the agreed migration scope.

For every proposed new or changed type, state: “This type owns …”. Confirm that
the responsibility is not already owned by an existing type.

Preserve these CFA invariants unless the developer explicitly asks to change
the architecture:

1. Each screen-level SwiftUI View owns a dedicated ViewModel in private `@State`
   named `viewModel`.
   Construct it at the declaration by default. A detail View may initialize
   its stored ViewModel from a selected immutable snapshot. A computed property or a
   ViewModel passed in or shared by another View violates screen ownership.
   Previews use the same ownership and storage boundaries. A normal preview
   constructs the View, which creates its ViewModel and resolves its Feature
   through the normal default. Do not attach SwiftData to a View or preview.
2. ViewModels default narrow Feature dependencies from AppModel.shared; tests
   may provide isolated Features.
3. Preserve independent screen and scene selection in presentation, not shared
   Features. Selected detail data may be passed into the View.
   Keep an open detail and its selected snapshot stable when the source list
   changes. Use explicit refresh where appropriate. Live updates depend on
   the product requirements.
   When a new app supports deep links or notification actions, its
   DeepLinkingFeature validates received opening requests. Persist only the safe
   data needed to identify and present each request before confirming it is kept.
   Handle expired or unavailable destinations clearly. Scheduling and delivery alone do
   not add an item. Settings shows the shared pending list, which either scene
   can act on using its own navigation state. Protect unsaved edits and active
   payment flows. Concurrent attempts must not open the same request twice.
   Remove a request after successful navigation or explicit dismissal. Declining,
   cancelling before navigation, or failing to navigate leaves it pending.
   Navigation succeeds when the destination opens, even if cancellation follows
   or its content is still loading. If saving removal fails after navigation,
   report the storage failure and retry removal without navigating again.
   Until removal is saved, the request may reappear after restart.
   A separate history is opt-in for new apps.
   During migration, preserve existing deep-link, notification and history
   capabilities.
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
10. A production SwiftData repository with non-trivial reads, writes, imports
    or data sets uses a dedicated `@ModelActor`. Keep its `ModelContext` and
    SwiftData records within the storage boundary and return immutable
    `Sendable` domain values to the MainActor Feature. Use the MainActor
    context exception only for deliberately UI-owned work proven short.
    The storage boundary still applies in that case.
11. Views remain declarative. Bundle/system reads and presentation formatting
    belong to the adjacent ViewModel; business, persistence, and shared state
    belong to the owning Feature.
12. A ViewModel initializer defaults its narrow Feature dependencies from
    `AppModel.shared`. A detail ViewModel may also receive a selected immutable snapshot;
    avoid unrelated convenience parameters.
13. Each local data responsibility uses the simplest single persistence route.
    A replaceable remote snapshot normally uses one JSON cache; SwiftData is reserved
    for genuinely structured, queryable, growing, or relational local data.
    Do not persist the same snapshot through both a database and a file cache.
    Publish durable user edits as saved only after required persistence succeeds.
    Persist individual changes by stable record identity. Reserve whole-dataset
    replacement for explicit operations with their own integrity rules.
    For simple preferences, update `UserDefaults` before publishing the value.
    Its setter confirms the in-memory update only. Use a storage API that
    reports the write outcome when the product requires confirmed persistence.
    When both restoration and refresh are needed, start them independently.
    A missing, incompatible or unreadable optional cache must leave the download
    free to proceed. Publish current server data and complete the refresh for
    its callers without waiting for the cache write. Retry within a bounded
    policy, preserve a good cache if
    replacement fails, and prevent older writes or restores from replacing
    newer data. Report offline availability only for a saved cache.
    Use JSON by default. Offer Instant Loading binary snapshots only on request
    for a sufficiently stable format with safe rejection of incompatible data.
    Apply the [offline editing and sync rule](spec/rules/cfa-sync-01.md) when
    the product requires synchronization. For offline edits sent to a custom
    server, save the edit and its pending-sync metadata together before
    reporting local success. Report server confirmation separately. Verify
    pending edits survive failed sync and restart, retries avoid duplicates,
    and conflicting edits and server rejections follow the product policy.
    If changing an existing sync implementation, start verification with
    an edit persisted by the previous implementation. Check that the updated
    app restores its identity and pending metadata and can retry it safely.
    Verify Apple-managed sync and cross-device conflicts on supported devices
    when applicable, separately from tests using controlled dependencies.
    Use the product-defined safe fallback when a non-critical preference is
    missing or when its recognised stored format contains an obsolete value. Preserve the old value where appropriate.
    Replace it through an intentional migration or a successful user choice.
    Treat unreadable or corrupt durable storage and failed durable writes as errors. A fallback must never imply that user
    records loaded or saved successfully.
14. AppModel stores `shared`, concrete Features, one private launch Boolean,
    and private task handles needed to own app-wide listeners. Its explicit
    initializer assigns injected Features, sets the launch guard to false and
    initializes any app-wide listener task handles to nil;
    its single `static live()` constructs all production dependencies. No
    service, container, loading/error presentation state, or defaulted Feature
    property belongs in AppModel. AppModel starts and owns app-wide listeners
    and forwards events to the responsible Feature, which interprets them.
    Feature-owned background capabilities register their own handlers. For
    BGTaskScheduler, register each permitted identifier once before launch
    finishes and schedule requests separately. Route app-level callbacks through
    AppModel. Verify that expiration cancels work and that success, failure
    and expiration each complete the system callback exactly once. Exercise
    expiration racing completion. Record actual background delivery on a
    supported device separately from controlled handler tests.
    Keep unrelated background capabilities with their owning Features. A Feature
    can keep work running after its screen closes. Continuing after the app
    itself enters the background requires an appropriate system mechanism.
    For additional device or extension targets, include the appropriate shared
    Model source and target-specific presentation. Verify target membership,
    API availability and lifecycle requirements. Each process has its own
    AppModel and Feature instances. Transfer immutable snapshots through an
    appropriate platform mechanism and refresh observable state at the receiving
    Feature. If the iPhone app shares an App Group snapshot with a widget,
    verify that a successful write precedes the timeline reload request and
    that a failed write issues no request. WidgetKit controls reload timing.
    Send the Watch a separate snapshot copy through a suitable transfer
    mechanism. Test missing, unreadable, delayed and stale snapshots against
    the receiving target's policy. Verify actual transfer and receiver updates
    on supported devices, and record that evidence separately from target builds
    and controlled storage tests.
15. SwiftData access goes through `SwiftDataManager`; every `URLSession` call
    goes through `NetworkingManager`. Features own those lower-level
    collaborators. Keep domain-specific services beside their owning Feature
    while that location remains descriptive. Put broadly applicable services
    in a shared location and compose a shared instance in `AppModel.live()`
    when common configuration or shared state requires it. Views/ViewModels
    never open storage or make transport calls. Independent requests must
    reach the transport without waiting for another response unless a
    documented policy limits them. Where networking changes, hold one
    response open and verify that a second independent request reaches
    the transport before releasing the first.
16. The app delegate calls `AppModel.shared.applicationDidFinishLaunching()`
    directly and synchronously. Features may start asynchronous work without
    making the callback await disk or network completion.
    Keep synchronous startup work brief. Task creation order does not establish
    disk or network start order. Measure launch and first-frame timing
    separately from Feature readiness.
    No View `.task` performs app launch, and no App, delegate, or View stores an
    AppModel reference. ViewModels retain only the narrow Features needed by their screen.
17. The SwiftUI `App.body` declares a stable root View and app-wide presentation
    modifiers only. No startup `if`/`switch`, storage gating, database loading,
    feature error display, or AppModel property belongs there. The root View
    manages navigation only; feature screens present their own state.
18. Database availability never gates the interface, including root wrappers
    and app-wide blocking overlays. Construct the root independently of storage;
    open storage lazily inside a Feature's data request. Before opening a
    file-backed store, its owner prepares the parent directory at the configured
    store URL. Directory and opening failures follow the request's error path
    through Feature → ViewModel → feature screen,
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
    explicitly. Trace sign-out, account switching and external session expiry
    when supported. If sign-out fails before the session ends, retain account state;
    after success clear affected state and prevent old requests from republishing
    it. Check the current account or session generation before publishing an
    in-flight result, including when a request has been cancelled. If the same
    account can sign back in before earlier work finishes, verify that the
    earlier session cannot publish into the new one. Reconcile
    partial authentication outcomes and handle cleanup failures honestly.
    If sign-out promises a fresh-install experience, clear account-specific
    in-memory state, caches and local files after successful sign-out. Preserve
    independent purchases and user-owned documents, and handle unsynchronised
    work according to the product contract.
21. New-app visual starting points live in [new-app design defaults](new-app-design-defaults.md).
    Use them only where appropriate to the recorded workflow and current request;
    user-approved designs override defaults. Do not require palette counts or
    a popup theme selector when adopting CFA in an established product.
22. ViewModels retain named handles for the unstructured Tasks they create by
    default. Equivalent repeated button actions return the same handle, and
    asynchronous callers await its value. SwiftUI lifecycle tasks and structured
    child tasks keep their existing owners without stored wrappers. Each Feature
    operation shares equivalent in-flight work and returns its outcome to all
    callers, or queues commands that must each execute in admission order
    across suspension points and returns each caller its own outcome. Record
    input identity, cleanup, cancellation and any product-required exception. Never lose a required edit as a duplicate, even
    when its input matches another command.

23. The branded Settings About/footer is a new-app default, not a CFA invariant.
    Existing apps receive it only on an explicit request such as “add CFA footer
    to Settings View”. Never repeatedly prompt or fail an ordinary tidy-up
    because themes, a footer or CFA branding are absent.

## Before delivery

Review the changed source as one feature slice, not as isolated files.
When the scope includes a paid capability, establish its entitlement policy and
trace every identifiable entry point to a check of current entitlement before
paid presentation or execution. Flag established unguarded paths and report unresolved paths as unverified. Test locked and entitled paths;
do not claim that UI gating replaces server-side authorisation.

- Where one execution satisfies equivalent ViewModel actions or Feature calls,
  verify those callers share its completion. Do not coalesce distinct commands
  that must each take effect. Verify queued commands execute in admission order
  and return their own outcomes. Test failure/cancellation cleanup and a later
  retry using controlled dependencies, not sleeps; record exceptions explicitly.

- For changed pull-to-refresh flows, verify that the refresh action awaits
  completion through an async method or the returned task handle. Hold the
  request pending and check that the indicator remains active until the
  screen's wait ends.
- For a shared refresh that should survive navigation, cancel its only screen
  waiter while the request is suspended. Let the request complete with no
  replacement waiter and verify that the Feature retains the result. In a
  separate case, admit an equivalent caller while the request is still in flight
  and verify that it receives the shared outcome without a second request.
  Verify that cancelling one of several waiters leaves the others able to finish.
  When a waiter must exit promptly, verify that it returns before releasing the
  suspended refresh.
- Trace every affected screen to its ViewModel and required AppModel Features.
  Do not require a distinct Feature per tab or screen. Require named tests for
  each actual Feature; test shared data across screens without duplicating owners.
- For a growing ViewModel, ask: is it arranging existing capabilities for this
  screen, or implementing a new business capability itself? Only the latter
  points towards extracting business behaviour into the model. Keep presentation
  coordination in the presentation layer; dependency count alone is not a defect.
- For changed workflows that coordinate Features, trace which Feature owns
  each business decision and state update. Verify that coordination serves a
  business capability, preserves one authoritative owner for each state value,
  and keeps dependencies free of cycles.
- Inventory screen initializers and call sites. Verify private ViewModel
  ownership and the `viewModel` property name separately. Allow selected-value
  detail initialization. Screen initializers must not receive a ViewModel,
  AppModel, a Feature, a repository or an ancestor's navigation command.
  Check that View and ViewModel initialization and View body construction
  avoid blocking I/O, slow work and asynchronous side effects. Keep screen
  and scene navigation selection in presentation. For a changed detail flow, open
  distinct snapshots in two independently identified destinations. Refresh
  the source list, including a response that omits a selected item, and
  verify both destinations stay open with their own selections. If a detail
  offers explicit refresh, verify it updates only that destination.
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
- Confirm that each new screen ViewModel and concrete Feature has its own
  named test file in its ViewModel test group or under `FeatureTests`,
  respectively.
  Verify target membership and the behaviours each test actually exercises.
- Confirm that launch refresh logic is absent from RootTabView and feature
  screens use `.task` for their own initial work—not as a substitute for
  application launch. Trace the delegate's direct synchronous call to
  AppModel and confirm AppModel signals each relevant Feature before the
  delegate returns. Confirm the Features own their refresh tasks and that
  pending disk or network work cannot gate the root UI. Verify that a
  repeated launch callback does not start the work again.
- When launch and screen refresh can overlap, verify the Feature's policy.
  By default, equivalent callers that need the outcome join the same
  Feature-owned request and receive its result. The synchronous launch signal
  may start the request without waiting. Test success, failure and cleanup,
  and record the reason and tests for any different product policy.
- Confirm repeated synchronous Button actions follow their intended policy:
  equivalent requests may reuse a ViewModel-owned task when one result satisfies
  every caller; distinct commands that must each take effect are admitted and
  coordinated without silently dropping presses. Async callers await the
  appropriate task's value.
- Read the App `body`: it must install a stable root without branching on
  storage, loading, or errors. Do not merely move that branch into RootTabView.
- For persistence changes, hold the initial store open pending and verify that
  the root appears and Settings or another independent screen is reachable
  while it waits. Fail the open and verify that independent navigation still
  works and the affected Feature presents a recoverable request error. Verify
  successful retry and retained data after failed refresh. For a file-backed
  store, test first use with a missing parent directory and a failure to create
  it. Verify retry uses the configured store and that the failure neither
  removes existing data nor substitutes another store. Report any storage or
  UI checks that did not run.
- For changes to durable editing, hold the save pending and verify that
  confirmed state stays unchanged. Fail the save and verify the screen
  ViewModel retains the draft for retry. Verify a successful retry publishes
  the confirmed replacement. Separately, cancel an unsaved edit and verify
  that the draft is discarded and the stored and confirmed values are unchanged.
- For optional download caches, verify refresh starts while restoration is
  pending, or when the cache is missing, incompatible or unreadable. Hold the
  cache write pending and verify the Feature publishes fresh data and releases
  its refresh callers. Force the cache write to fail and verify that retries
  are bounded, the fresh data stays visible, the previous usable cache is
  preserved and the app does not claim the fresh data is available offline.
  A failed refresh preserves valid displayed data. A late restore or delayed
  write must leave the newer snapshot intact.
- For changes to the pending deep-link flow, verify that invalid opening
  requests leave the pending list and its stored snapshot intact. Force the initial save to fail
  and verify that the failure is reported and the request is never presented as
  saved. Admit a request while restoration is suspended and verify that both
  the restored and new requests survive restart. Verify that declining or
  cancelling before navigation leaves a saved request available after restart.
  Cancel after the destination opens and verify that it still counts as opened
  and the pending item is removed. Verify either scene can open a shared
  request, and simultaneous attempts navigate only once. Race an open against dismissal of the same request and
  verify that the outcomes agree with the pending list and navigation state.
  Force a removal write to fail
  after navigation, then verify that the error is reported and retrying the
  write removes the item without reopening the destination. During migration,
  verify that existing URL and notification destinations, deferred opening
  behaviour and any ability to reopen an item from history are preserved. Use the
  [review checklist](spec/topics/29-review-checklist.md) for the full scope.
- Confirm that concrete feature types and their AppModel properties retain the
  `Feature` suffix.
- When a change introduces or duplicates app-wide values, apply the
  [shared constants rule](spec/rules/cfa-const-01.md). Define repeated shared
  values once in a purpose-named enum. Keep Feature-specific values with
  their owner and use bundle metadata and localization resources where
  they are authoritative. Keep secrets out of app constants.
- For changed app-wide listeners, drive a controlled event source after repeated
  startup signals. Verify a single listener forwards events to the owning
  Feature with no screen present. Where cancellation or replacement is
  supported, verify that the old listener stops forwarding events and that its
  cleanup leaves the replacement running. Shut down isolated listeners during
  test cleanup.
- For changed observer-backed streams that support resubscription, verify that
  a late event from the old registration cannot update the replacement and
  that delayed teardown removes only the old registration.
- Inspect AppModel's stored properties, initializer, and `live()`; then search
  for `AppModel.shared` stored elsewhere, View-tied launch calls,
  `ModelContainer` outside the storage boundary, and direct `URLSession` calls.
- Confirm that storage work does not leak SwiftData `@Model` objects across an
  actor boundary, and that a `@ModelActor` is used where database work is not
  deliberately small and UI-owned.
- For changed record-level writes, overlap edits to different records and
  verify that both changes survive reopening the store.
- If a change affects durable storage, reopen a disposable store created
  by the prior version with representative synthetic records. Verify that its
  location and saved records remain
  usable and that a failed open or upgrade preserves the original data.
- After replacing a route, check callers, target membership, tests and system
  entry points before removing superseded methods, stored state or files.
  Preserve code that still serves another route. Remove duplicate state owners
  and speculative abstractions introduced by the change, and correct placeholder
  names.
- Build and run focused tests when available. Report an unavailable runtime or
  toolchain honestly; do not turn missing verification into a pass.

If any invariant fails, correct the plan before expanding the implementation.

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
  Feature dependencies, presentation owner (the dedicated ViewModel for a
  screen-level SwiftUI View), composition owner, named tests, and any
  intentionally retained legacy boundary;
- a current concurrency inventory showing every scoped GCD, callback,
  OperationQueue, timer, lock, or delegate route as migrated or explicitly
  retained with a reason;
- the hybrid implementation review, identifying remaining users of legacy
  mechanisms and dependencies and recording which adapters were removed or
  intentionally retained to preserve behaviour or platform support. Where a
  consumer needs every event, verify repeated values, ordering and cancellation
  separately from the latest UI state;
- the minimum OS for each affected target and compatibility evidence for
  changed paths at that minimum. Check API availability separately from
  Swift language mode. Preserve existing deployment support unless the
  developer approves a change;
- the final CFA audit across the agreed scope, with evidence for each applicable
  requirement and reasons for requirements that do not apply. Resolve actionable
  deviations and re-verify after corrections. Record any agreed exception and
  its effect on the conformance verdict. An applicable requirement with missing
  evidence remains unverified and keeps this checkpoint open;
- passing builds for each affected target, plus relevant automated tests
  and manual behaviour regression, all tied to the final commit. Compare
  affected capabilities, meaningful interactions and access to existing saved
  data with the pre-migration baseline. Record confirmed defects fixed in
  scope and material differences introduced by required platform or API changes.
  Include
  existing extension or device targets that consume changed shared code.
  Verify any affected data handoff separately from the build. If a relevant
  regression check fails, retain its evidence and reconcile differences in
  target, build configuration and OS. Verify the affected scenario on the
  configuration where it failed before accepting the handoff; and
- a human architecture review confirming that the navigator communicates the
  agreed structure.

If any item is absent, failed, or only inferred, say **“Continuing migration”**
and name the missing checkpoint. Record a failed pilot honestly and block it
from precedent use; do not reframe it as a completed partial migration.
