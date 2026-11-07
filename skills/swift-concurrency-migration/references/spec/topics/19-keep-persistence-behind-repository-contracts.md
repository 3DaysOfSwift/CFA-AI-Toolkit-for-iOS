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
or data sets, use a dedicated `@ModelActor`. It owns its `ModelContext`; feature
features remain `@MainActor` and publish only immutable `Sendable` domain
values after awaiting the repository. SwiftData `@Model` records never cross
from the model actor into a feature, ViewModel, or View. A small,
deliberately UI-owned context may be main-actor isolated when its work is proven
short, but that is an exception—not the default commercial persistence design.

Publish user edits and other durable commands as saved only after the required
authoritative persistence succeeds. Keep an editable draft on failure and report
the error; do not present unsaved changes as saved. Loading and error
presentation may update independently.

A replaceable local cache of data already obtained from an authoritative remote
source is different: publish a successful, current response without waiting for
the optional cache write. Attempt caching independently, use a bounded retry,
and do not misrepresent an unsaved cache as available offline. A cache failure
must not turn the successful remote response into a failed download or discard
the data. Preserve an existing good cache when a replacement fails and prevent
older writes from overwriting newer snapshots. This exception does not apply to
user edits, purchases, reminders, or other changes that require a durable save.

For a real schedule Feature using cached provider data, inspect
[Next Rocket Launch's LaunchScheduleFeature](https://github.com/3DaysOfSwift/RocketLaunch-iOS-App-Swift-Concurrency/blob/3ecaa30c76428bd8a6f5db8fd5506b6c20b846f7/Swift%20Concurrency%20Project/RocketLaunch/2%20-%20AppModel/Features/Launch%20Schedule/LaunchScheduleFeature.swift).
Treat the linked implementation as a source to examine, not as proof that its
entire project conforms to every current rule.

For replaceable server data, a saved snapshot can provide a fast initial display
and limited offline access without introducing offline editing or a sync engine.
When the product needs both restoration and a fresh request, start them
independently rather than delaying the request for the optional cache. Publish
restored data only if a newer authoritative response has not already superseded
it. A missing, incompatible or unreadable optional snapshot must not block the
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

