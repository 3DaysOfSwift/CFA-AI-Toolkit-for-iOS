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

If navigation succeeds but removing the saved request fails, report the storage
failure and retry removal without navigating again. In-memory tracking prevents
another open only while the process is running. If the app exits before removal
is saved, the request can reappear unless the product uses a durable mechanism
to record completion.

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

