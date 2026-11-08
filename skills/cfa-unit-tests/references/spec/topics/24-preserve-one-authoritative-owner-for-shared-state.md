## Preserve One Authoritative Owner for Shared State

Every piece of shared mutable application state has one authoritative Feature
owner on the main actor. Persistence records and implementation caches are
representations used by lower-level services, not additional authorities for the
application's current business state. ViewModels expose, format, and temporarily edit that state;
they do not maintain competing copies that require manual synchronization.

The screen's ViewModel owns editable field values and other screen presentation
state, including unsaved drafts, selections, loading presentation and transient
errors. SwiftUI-specific state such as focus may remain in the View. A text-field
draft is not saved application state: retain it on save failure for retry and
discard it on cancellation. Persisted collections,
entitlements, synchronization status, and domain results belong to their feature.

Feature APIs expose state as read-only and provide named commands for mutation.
Views and ViewModels never mutate a feature collection directly. Every domain
mutation passes through the feature that owns its rules and persistence.

For paid capabilities, `PurchasesFeature` owns entitlement state. The screen's
ViewModel combines it with the relevant capability Feature and checks the
current entitlement before presenting or calling a paid capability; otherwise
it presents the appropriate locked or purchase experience. Apply this to every
relevant entry point, including alternative screens and other callers. Keep
pricing and purchase checks out of the capability Feature so its behaviour can
be reused as the product's pricing changes. Payment-provider services can be
owned by the purchase capability. Server-protected operations still require
server-side authorisation: a UI check is not a security boundary.

A CFA conformance audit must trace known paid capability entry points and flag
an established unguarded path with its source and consequence. First establish
which capabilities are paid from product requirements and entitlement policy;
do not infer a paid capability from a name alone. If an entry point, dynamic
dispatch or entitlement check cannot be resolved, report it as unverified rather
than claiming the check passed. Exercise locked and entitled outcomes and
relevant alternate entry points in behavioural tests.

