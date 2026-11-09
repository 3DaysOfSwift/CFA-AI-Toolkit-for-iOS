# One storage owner and honest writes

Topic: `persistence-boundaries`  
Rules: `CFA-STORE-01`, `CFA-STORE-02`, `CFA-STORE-03`, `CFA-SPEC-CACHE-01`, `CFA-SPEC-STORE-01`, `CFA-SPEC-SYNC-01`\
Classification: mixed  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

CFA uses one app-owned SwiftData storage boundary when a database is warranted. Repositories expose domain operations, retain storage representations internally, and persist record-level mutations without replacing unrelated data.

Features own authoritative application state. A persisted record, implementation cache or database context is not a second business authority. Storage services may retain internal machinery, but must not maintain a competing current profile or feed independently of its Feature.

Persist user edits and other durable commands before reporting them as saved. On failure, keep the existing state, retain the editable draft and report the error for retry. Loading and error presentation may update separately.
In a local-first workflow, publish an edit as locally saved only after
durably storing the edit and any required pending-sync metadata. Track
remote confirmation separately and preserve pending changes across retries
and restarts.

For simple preferences backed by `UserDefaults`, update the defaults before
publishing the preference. The setter confirms only the in-memory update.
When a workflow requires confirmation that the value was written to disk,
use a storage API that reports the write outcome.

An optional local cache of a successful remote response can be saved
independently. Show the current response and complete the refresh for its
callers while the cache write is pending. Try the cache write with a
bounded retry, preserve any previous good cache on failure, and do not imply the
new data is available offline unless it was saved. Keep writes ordered so an
older snapshot cannot replace a newer one.
Start cache restoration and remote refresh independently when both are needed.
A late restore cannot replace a newer server response for the same data.
With independent sources, a fresh response for one source leaves the others
free to restore their usable cached data. A refresh failure leaves valid
in-memory data available.

Published snapshot structs for API or persisted data use `let` properties and
represent immutable values. Check nested values and collection elements for
mutable reference state, because a `let` property can still point to an object
that changes in place. Replace snapshots after a successful save or refresh.
Never retain a locally modified snapshot as saved state. The screen ViewModel
owns editable form drafts and passes proposed changes to the Feature for
validation and persistence. A failed save leaves the
draft available for retry and the last confirmed snapshot in place.

## Problem

Per-feature containers duplicate initialization and ownership. Replacing a collection from a stale snapshot can lose someone else's edit. Quiet in-memory fallbacks turn failure into apparent empty success.

## Documented rationale

The coding guide chooses a single store owner for consistency and distinguishes replaceable snapshots, which use JSON by default, from queryable durable data. Its recorded overlapping-container investigation motivates cautious initialization; it is not an Apple-confirmed explanation of framework internals.

Publishing durable edits as saved only after persistence succeeds avoids displaying unsaved changes as saved and avoids rolling back an optimistic authoritative update. The user can keep editing or retry after failure. A downloaded response is already confirmed by its remote source; an optional local cache must not prevent the user from seeing it.

## Trade-offs and alternatives

Editorial analysis: a shared storage owner needs clear schema and lifetime policies. Some products genuinely require separate stores; the convention requires explicit justification and migration planning rather than deleting existing ones.

## Scope and exceptions

Use JSON by default for replaceable snapshots. Instant Loading binary
snapshots are an opt-in technique for stable formats. Their decoder must
safely reject incompatible or corrupt data. Help apply the technique when the
developer requests it. During app creation or migration, recommend JSON when
a simple cache fits and leave binary snapshots out of the proposal.

One store is a CFA choice, not a SwiftData limit. Keep each context and managed object within its isolation boundary. The guide reports a macOS investigation; do not claim all iOS versions reproduce it, or that passing tests guarantee framework safety.

## Verification

For non-trivial SwiftData work, verify that a dedicated `@ModelActor` owns
the context and that expensive work executes off MainActor. Trace where
the actor and context are created. Confirm that only immutable Sendable
domain values leave the storage boundary. A deliberately UI-owned context
is an exception for work proven short.

Exercise fresh directory preparation, concurrent first requests, isolated test stores, failed saves, reopening and retry. Verify record updates preserve unrelated records. Hold a previously published snapshot while saving a change and verify that it stays unchanged when the Feature publishes the replacement. Record runtime/toolchain and preserve shipped paths and schema.

For optional caches, hold restoration and writes independently in tests.
Confirm refresh starts while restoration is pending and still proceeds when
the cache is missing, incompatible or unreadable. Verify callers receive
fresh results while the write is pending. Check that a late restore or
delayed write cannot replace newer data, that a failed write leaves fresh
results usable and preserves the last good cache, and that a failed refresh
retains valid in-memory data.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. That permission is not individual technical or historical approval.

## Open question

Link an approved, redistributable reproducer and affected-runtime evidence before publishing a detailed framework-crash case study. The local guide alone is not a reviewed public evidence package.

## Publication

[Read the public explanation](https://www.3daysofswiftconcurrency.com/cfa/explanation/persistence-boundaries).
Verified on 2026-10-29 for topic relevance, anonymous access, readable code,
desktop/mobile layout and the training footer. The catalogue records the review
evidence. This dated verification does not imply that the page was checked today.
