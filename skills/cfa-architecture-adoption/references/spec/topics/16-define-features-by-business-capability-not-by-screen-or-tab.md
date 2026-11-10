## Define Features by Business Capability, Not by Screen or Tab

A screen can present several independent business capabilities. A Feature can
support several screens and device experiences, or have no dedicated screen.
Features own meaningful application capabilities and their authoritative business
state; screens and tabs do not determine the number of Features.

For a working example, inspect `HabitsFeature` in the bundled Habit Tracker
starter app. It owns saved habits and is used by both `HabitsViewModel` and
`AddHabitViewModel`, giving those screens access to the same capability.

During creation or migration, main screens are useful clues for discovering
capabilities, not a requirement to create one Feature per screen or tab. Record
each SwiftUI screen route as screen → dedicated ViewModel → required AppModel
Features → named Feature tests. For an existing UIKit screen in a migration,
record its actual presentation owner and trace the same Feature and test
boundaries. Several routes may use the same Feature, and a route may use
several Features. Do not create empty tab owners or duplicate state to satisfy
a one-to-one mapping.

For example, SettingsViewModel can combine SettingsFeature and UserProfileFeature.
Other screens can observe that same UserProfileFeature through their own
ViewModels. The profile retains one authoritative owner. Navigation, tab selection
and device-specific layout remain presentation responsibilities.

Start new apps with independent Features using lower-level services supplied
through their initialisers. A screen combining their outputs does not require
the Features to depend on each other. An architectural extension that composes
Features needs an identified business responsibility; do not add one solely
because a ViewModel has several dependencies. Keep any such composition explicit,
directional and free of cycles, and preserve existing behaviour during migration.

An evolving app may reveal a distinct, reusable business capability that
coordinates other Features. This coordinating Feature—sometimes called a
“big brother Feature” in discussion—is a normal Feature in AppModel and the
standard Feature folder structure. It owns its own business decisions and uses
the existing Features rather than duplicating their authoritative state. For
example, a Today capability may decide which accomplishments or resources to
show using data from another Feature. A screen merely arranging existing data
does not by itself justify that extra Feature, and a migration must not create
one coordinator for every screen.

Conversely, work that sounds like coordination is not necessarily several
Features. If the product's checkout is one cohesive capability, a
`CheckoutFeature` can own its cart and coordinate a private payment service to
complete a purchase. Split or compose capabilities only when actual business
responsibilities and reuse justify it.

Verify each screen's actual Feature dependencies and each Feature's named
behavioural tests. Test consistency across screens that use shared state.
Introduce an additional Feature when there is a distinct business capability,
not merely a new tab, screen, visual section or device target.

An API endpoint is evidence about a capability, not an instruction to create
one Feature per endpoint. For example, one `PostFeature` can own posts and their
comments even when it calls different APIs for each. Similarly, a
`UserProfileFeature` can own profile, account and login behaviour when those
form one coherent capability. Choose boundaries from the app's actual business
requirements; do not multiply similar Features merely to mirror HTTP calls.

For a small application, an existing account operation can coordinate the
Features affected by it directly. For example, `UserProfileFeature.signOut()`
can call explicit account-data clearing operations on `OrdersFeature` and
`FavouritesFeature`. The profile Feature coordinates the workflow; each
affected Feature remains the owner of its own state. Supply dependencies through
initialisation, keep the direction of dependencies free of cycles, and do not
create a separate coordinator or event infrastructure solely to relay this call.
If the workflow grows into a distinct capability, reassess its boundary rather
than assuming that a separate coordinating Feature is always required.
When sign-out fails before the session ends, keep the user signed in and retain
their account data and report the failure so they can retry. If authentication
reports an error after a partial outcome, reconcile the actual session. Clear
account-specific Feature state once the session has ended, including when the
authentication operation also reports an error.

When the app's sign-out contract promises a fresh-install experience, clear
account-specific memory, caches and locally stored files once the session
has ended. Identify data that belongs to the account before deleting it; handle
unsynchronised user work transparently and do not treat independent purchases
or user-owned documents as disposable account caches. Keep the signed-out
experience and cleanup failures truthful.

Trace every account-change entry point, including sign-out, account switching
and external session expiry. Before publishing an in-flight result, verify that
its account or session is still current, even if cancellation was requested.
When earlier work can overlap a new sign-in to the same account, compare a
session generation or equivalent session identity because both sessions have
the same account ID. Apply the same session boundary to account-scoped storage
effects. A late request must not recreate cleared data, and delayed cleanup must
not delete data written by a newer session. Where these operations can overlap,
coordinate writes and cleanup at the storage boundary or isolate their storage
by session. Verify the stored data after the late work finishes as well as the
Feature's visible state.

During migration, inspect whether an existing account-change event system can
be simplified into explicit calls. Before removing observers, verify that the
replacement still handles every entry point, preserves the product's privacy
and storage requirements, and handles authentication and cleanup failures.

Business requirements also determine how many instances of a domain entity
exist. For a simple shopping app, start with one shared `ShoppingCartFeature`
owning one cart. Introduce multiple carts only when the product needs them:
for example, one per restaurant, one shared across scenes, or separate carts per
scene. Scene-specific presentation chooses which cart to display; the Feature
owns the cart data and should not depend on tabs or screen layout. When separate
scene carts are required, define their identity and lifetime from the product's
needs rather than creating a separate Feature instance for each ViewModel.

