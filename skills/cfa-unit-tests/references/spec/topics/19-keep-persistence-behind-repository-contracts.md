## Keep Persistence Behind Repository Contracts

Features speak to repository protocols in domain language. They do not
know file paths, CloudKit record fields, HTTP routes, database tables, or cache
formats.

Repository implementations:

- isolate external systems;
- convert storage representations to and from domain values;
- protect mutable state using actors or another explicit isolation mechanism;
- define offline, retry, and synchronization behaviour;
- throw meaningful errors rather than silently inventing success.

For production SwiftData repositories with non-trivial reads, writes, imports,
or data sets, use a dedicated `@ModelActor`. It owns its `ModelContext`; Features
remain `@MainActor` and publish only immutable `Sendable` domain
values after awaiting the repository. SwiftData `@Model` records never cross
from the model actor into a feature, ViewModel, or View. A small,
deliberately UI-owned context may be main-actor isolated when its work is proven
short, but that is an exception—not the default commercial persistence design.

For an individual create, update or delete, write the change by stable record
identity. Replacing the collection from a caller's snapshot can overwrite
unrelated changes made since that snapshot was read. Reserve whole-dataset
replacement for explicit operations such as import or restore, with their own
integrity rules.

Publish user edits and other durable commands as saved only after the required
authoritative persistence succeeds. Keep an editable draft on failure and report
the error; do not present unsaved changes as saved. Loading and error
presentation may update independently.

For simple preferences, `UserDefaults.set` updates the process's in-memory
defaults immediately and writes to disk asynchronously; it does not report a
durable-write result. Update the defaults before publishing the preference,
but do not present the return from `set` as proof that the disk write succeeded.
If a product requires confirmed persistence and recoverable write errors, use an
appropriate storage API that provides those results instead. Apple documents
[UserDefaults write behaviour](https://developer.apple.com/documentation/foundation/userdefaults)
and says [`synchronize()` is unnecessary and should not be used](https://developer.apple.com/documentation/foundation/userdefaults/synchronize()).

A replaceable local cache of data already obtained from an authoritative remote
source is different. Publish a successful, current response and complete the
refresh for its callers without waiting for the optional cache write. Attempt
caching independently, use a bounded retry,
and do not misrepresent an unsaved cache as available offline. A cache failure
must not turn the successful remote response into a failed download or discard
the data. Preserve an existing good cache when a replacement fails and prevent
older writes from overwriting newer snapshots. This exception does not apply to
user edits, purchases, reminders, or other changes that require a durable save.

For a working example, inspect `GitReposFeature` in the CFA App Xcode project
template included with the full toolkit. It starts refresh and cache restoration
independently, retains fresh results, and writes the optional cache separately.
Its accompanying `GitReposFeatureTests` exercises shared refresh and cache
failure behaviour.

For replaceable server data, a saved snapshot can provide a fast initial display
and limited offline access without introducing offline editing or a sync engine.
Use a JSON file as the understandable default when a simple cache is appropriate.
The Instant Loading binary snapshot technique is an advanced, opt-in approach
suited to a sufficiently stable format; its decoder must safely reject incompatible
or corrupt data. Help a developer apply it when requested, but do not propose it
as part of creating or migrating a project.
When the product needs both restoration and a fresh request, start them
independently rather than delaying the request for the optional cache. Publish
restored data only if a newer authoritative response has not already superseded
it. When several sources own independent slices of a snapshot, compare freshness
for the same slice. A fresh response for one source should not discard usable
cached data for a different source. A missing, incompatible or unreadable optional snapshot must not block the
normal download; retain any existing valid in-memory data on refresh failure.
Choose caching and freshness behaviour according to the product's requirements.

Define what persistence success means. In a local-first application, a command
may succeed once data is durably stored on the device while remote
synchronization remains pending. Expose synchronization state separately; never
claim remote success when only the local write succeeded.

Do not add offline editing or cross-device synchronization to a new app by
default. When the product needs sync across a person's Apple devices, first
consider the system-managed option appropriate to the data: SwiftData with
CloudKit for compatible model data, or iCloud documents for document-based
content. Verify capabilities, deployment target, account availability, schema
constraints, conflicts and behaviour on real devices; system-managed sync is
not instantaneous or a replacement for local error handling. Do not put a
live SwiftData store in iCloud Drive as a substitute for CloudKit integration.
If the same item can be edited on multiple devices while offline, decide the
conflict outcome for that data: a latest version may suit a simple preference,
while user-created work may need both versions preserved or a user choice.
Do not assume the framework eliminates all product-level conflict decisions.

When the product instead requires synchronization with its own server, use
the server's contract and introduce a dedicated sync service when needed. If
offline edits are supported, durably save each edit and its pending-sync
metadata together before publishing it as locally saved. Preserve pending
changes across failures and restarts, make retries safe against duplication,
and apply a product-defined conflict and rejection policy. Report local saving
and server confirmation truthfully. Whether offline edits are allowed, how
conflicts are resolved, and what status the user sees are product decisions,
not universal CFA defaults.

When restoring a non-critical user preference, treat a missing or obsolete
recognised-format value as a compatibility case when the product defines a safe
default. For example, use the system appearance if a saved theme no longer
exists, without asking the user to intervene. Preserve the old value where
appropriate and replace it only through an intentional migration or a successful
user choice. Distinguish this from unreadable or corrupt storage and failed
writes, which remain errors; never apply a default to user records or other
important data as if they had been loaded or saved successfully. Test the
fallback, a known value, and genuine storage failures.

Never silently discard a business or persistence failure. Preserve user input
after a failed command and expose a recoverable error. `try?` is reserved for
explicitly best-effort work where failure has no business consequence, such as
an animation delay. Loading features expose meaningful idle, loading, ready,
empty, and failed states as appropriate. Retry behaviour must be intentional
and bounded.

