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

Use a `NetworkingManager` whenever the app makes network requests. It is a
lower-level service, not a Feature. It owns `URLSession` and wraps every session
call; feature-specific API adapters decode
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

