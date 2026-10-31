# One storage owner and honest writes

Topic: `persistence-boundaries`  
Rules: `CFA-STORE-01`, `CFA-STORE-02`, `CFA-STORE-03`  
Classification: mixed  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

CFA uses one app-owned SwiftData storage boundary when a database is warranted. Repositories expose domain operations, retain storage representations internally, and persist record-level mutations without replacing unrelated data.

Features own authoritative application state. A persisted record, implementation cache or database context is not a second business authority. Storage services may retain internal machinery, but must not maintain a competing current profile or feed independently of its Feature.

Persist proposed changes before publishing them as authoritative Feature state. On failure, keep the existing state, retain the editable draft and report the error for retry. Loading and error presentation may update separately.

Published snapshot structs for API or persisted data use `let` properties and
represent immutable values. Replace them with newly constructed confirmed
snapshots after a successful save or refresh. Never retain a locally modified
snapshot as saved state. Temporary form fields are unsaved drafts, not another
authority; the Feature handles validation and persistence.

## Problem

Per-feature containers duplicate initialization and ownership. Replacing a collection from a stale snapshot can lose someone else's edit. Quiet in-memory fallbacks turn failure into apparent empty success.

## Documented rationale

The coding guide chooses a single store owner for consistency and explicitly distinguishes replaceable JSON snapshots from queryable durable data. Its recorded overlapping-container investigation motivates cautious initialization; it is not an Apple-confirmed explanation of framework internals.

Publishing only after persistence succeeds avoids displaying unsaved changes as saved and avoids rolling back an optimistic authoritative update. The user can keep editing or retry after failure.

## Trade-offs and alternatives

Editorial analysis: a shared storage owner needs clear schema and lifetime policies. Some products genuinely require separate stores; the convention requires explicit justification and migration planning rather than deleting existing ones.

## Scope and exceptions

One store is a CFA choice, not a SwiftData limit. Keep each context and managed object within its isolation boundary. The guide reports a macOS investigation; do not claim all iOS versions reproduce it, or that passing tests guarantee framework safety.

## Verification

Exercise fresh directory preparation, concurrent first requests, isolated test stores, failed saves, reopening and retry. Verify record updates preserve unrelated records. Record runtime/toolchain and preserve shipped paths and schema.

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
