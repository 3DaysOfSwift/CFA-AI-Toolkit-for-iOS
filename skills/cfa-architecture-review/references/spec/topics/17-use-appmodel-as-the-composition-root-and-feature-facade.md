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

