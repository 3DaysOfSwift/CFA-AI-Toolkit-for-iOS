## Review Checklist

Before accepting a change, answer every question:

1. Can the folder location alone explain which layer owns every new type?
2. Does every screen-level SwiftUI View have its own adjacent ViewModel? For
   existing UIKit screens in a migration, have you mapped their actual
   presentation owners to their Features and tests?
3. Does each screen-level SwiftUI View retain its ViewModel in a private
   `@State` property named `viewModel`, with state scoped to its SwiftUI identity?
4. Can every View be created without receiving a ViewModel, AppModel, Feature,
   or repository, and do screen Views avoid receiving another screen’s actions?
   Reusable presentation components may receive action closures.
   Do previews construct their Views through the same ownership path, leaving
   Feature access to the ViewModel and SwiftData access to the storage service?
5. Is each business decision owned by its Feature? Can supporting Model
   helpers perform calculations or infrastructure work without becoming a
   competing authority for that decision or its state?
6. Can another target reuse the business decision without copying UI code?
   If the scope includes additional targets, verify shared Model membership,
   target-specific presentation, API availability and lifecycle. For snapshot
   sharing, test missing, unreadable, delayed and stale data on supported
   devices. When an iPhone app writes an App Group snapshot for a widget,
   verify that it requests a timeline reload only after a successful write.
7. Does each ViewModel depend on the smallest coherent set of concrete
   Features needed by its screen?
8. Does AppModel assemble and expose Features, own app-wide listener tasks,
   and limit coordination to genuinely application-wide responsibilities?
   Verify repeated startup signals start each listener once and that it forwards
   events to the owning Feature even when no relevant screen is visible.
   When a listener must stop or be replaced, verify the old task stops
   delivering events, including in isolated tests.
   For system background work, does the responsible Feature register each
   permitted handler once during launch and schedule requests separately?
   Verify that success, failure and expiration each complete the system
   callback once, including when expiration races normal completion, and
   that expiration cancels the work. Exercise background execution on a
   supported device.
9. Is persistence accessed through repository protocols, and are other
   external-system details handled by appropriate microservices?
10. Are async operations directly testable? Does each unstructured task have
    an explicit owner and a retained handle when needed? Do structured children
    and framework-owned lifecycle tasks stay with their existing owners, with
    no Task handles stored by a View?
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
    long-lived—be explained and managed appropriately? For a shared refresh
    that should survive navigation, verify that it completes and retains its
    result when its only screen waiter leaves. Verify that cancelling one of
    several waiters leaves the others able to receive the result. If the
    screen requires a prompt exit, verify that its wait ends before the
    shared refresh completes.
18. Is expensive work kept away from the Main Actor while observable results
    return to it safely?
19. Are failures, partial loading, offline persistence, and retry behaviour
    represented honestly?
    - For durable edits, does the Feature publish the saved value only after
      required persistence succeeds, leaving the draft available on failure?
    - For replaceable downloads, can refresh proceed independently of cache
      restoration and complete without waiting for an optional cache write?
      Verify that a late restore or delayed write cannot replace fresher data,
      that a failed refresh keeps valid displayed data, and that a failed cache
      write preserves the last usable cache without claiming the new data is
      available offline.
20. Are domain types stored with the feature that owns their meaning?
21. For each paid capability in scope, does every identified entry point check
    current entitlement before presenting or invoking it? Have locked and
    entitled outcomes been tested, including alternate entry points? Record
    unresolved paths as unverified. Verify server-side authorisation separately
    where the operation is protected by the server.
22. For account changes in scope, does failed sign-out preserve the session
    when it remains active? Does successful sign-out clear account-specific
    state and storage according to the product contract? Verify that old
    requests cannot publish into a new session and that partial failures
    are reconciled against the actual session state.

23. Does the application delegate call the AppModel launch method directly
    and synchronously? Verify that it initiates startup once and that the root
    stays available while storage or networking is pending or fails.
24. For deep linking in scope, do URL opens and notification actions reach
    the same routing capability while the receiving scene owns navigation?
    Where the app uses CFA's pending-request design, verify that a failed
    initial save surfaces the error and leaves the pending list unchanged.
    Verify that declining or cancelling before navigation preserves the
    request across restart. Either scene can open it, and successful
    navigation or explicit dismissal removes it. A cancellation after
    navigation still counts as opened. Verify that competing scene requests
    open the destination once. If saving the
    removal fails after navigation, verify that the failure is surfaced and
    retrying the removal does not navigate again. During migration, verify
    that existing notification and history capabilities are preserved.
    Verify that an opening request received during restoration survives a
    restart alongside the previously saved requests.
25. For offline edits or cross-device sync in scope, does the app distinguish
    local success from server confirmation? For a custom server, verify
    that the edit and pending metadata are saved together, survive failed
    sync and restart, and retry without duplicating the change. When replacing
    an existing implementation, verify recovery of a previously saved pending
    edit. Exercise conflict and rejection outcomes where applicable. Verify
    Apple-managed sync on supported devices.
26. For additional device or extension targets in scope, does each target
    include the shared Model and only its own Views and ViewModels? Build
    each target and verify API availability. Separately verify the snapshot
    handoff on supported devices, including the receiving Feature's state
    update and how it handles missing, unreadable, delayed or stale data.
    For an App Group widget snapshot, verify that the app requests a
    timeline reload only after the snapshot write succeeds.

Every applicable answer must be yes. Marking a question not applicable requires
a short explanation. Otherwise, the change is not architecturally complete.
