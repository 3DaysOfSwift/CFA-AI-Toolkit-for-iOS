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
finished. Starting tasks in source order does not guarantee the order in which
their network or disk operations begin. Call from `UIApplicationDelegate.application(_:didFinishLaunchingWithOptions:)`,
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
is only a replaceable cache, publish the current response and return to the
refresh callers without waiting for the cache write. An older cache restore
must not replace that response.
User edits that require durable storage follow the separate save-before-publish
rule. Reading a property must not secretly begin asynchronous work. A ViewModel
exposes these values as presentation-ready properties; its View shows loading,
failure, cached data, and retry for that feature.

Never use `.task { AppModel.shared.applicationDidFinishLaunching() }`
or an equivalent View-tied call to signal application launch. The app delegate
signals launch at the earliest applicable application lifecycle callback and
starts the shared system refresh concurrently with UI preparation.

A screen's `.task` is the normal, approved choice for that screen's own initial
asynchronous work. If `refresh()` returns a Task handle, use
`.task { await viewModel.refresh().value }` to wait for its result. If `refresh()`
is itself an `async` method, use `.task { await viewModel.refresh() }` instead.
Apply the same distinction to `.refreshable`. The refresh indicator stays
active while the screen awaits the result. When the screen needs to stop
waiting promptly on cancellation, use an async method that can end the
screen's wait independently of the shared work.
Awaiting an independently created Task's `value` does not make it a child of
the screen task or automatically cancel it when the screen task is cancelled.
The cancelled screen task can still wait for the shared result. If the
presentation needs to stop waiting promptly, handle cancellation for that
waiter independently while leaving the Feature's task running.
Choose its owner and cancellation policy explicitly; a shared Feature refresh
normally continues when a screen leaves.
SwiftUI starts the screen task before the View appears. It does not guarantee
that storage or network work
finishes before the first frame, so the screen must render an observed loading,
cached, empty, or error state while the work continues. Use the app lifecycle, not a screen `.task`, for a shared refresh that must
begin with launch. A refresh that only needs to outlive its initiating screen
can start when requested; the Feature owns its lifetime.

When launch and one or more screens can request the same refresh, the Feature
retains one in-flight task. A synchronous launch signal can start it and
return immediately. Later callers join the same work. Callers that need its
outcome can await the shared task directly, or use a separately cancellable
wait when they need to return promptly after cancellation. Publish the
outcome and clear the retained handle when the refresh finishes. The task
belongs to the Feature because the result remains useful after the initiating
screen leaves. A different lifetime needs a documented product or resource
reason and dedicated tests.
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

