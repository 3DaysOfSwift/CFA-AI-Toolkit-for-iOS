# One storage owner and honest writes

Topic: `persistence-boundaries`  
Rules: `CFA-STORE-01`, `CFA-STORE-02`, `CFA-STORE-03`  
Classification: mixed  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

CFA uses one app-owned SwiftData storage boundary when a database is warranted. Repositories expose domain operations, retain storage representations internally, and persist record-level mutations without replacing unrelated data.

Features own authoritative application state. A persisted record, implementation cache or database context is not a second business authority. Storage services may retain internal machinery, but must not maintain a competing current profile or feed independently of its Feature.

## Problem

Per-feature containers duplicate initialization and ownership. Replacing a collection from a stale snapshot can lose someone else's edit. Quiet in-memory fallbacks turn failure into apparent empty success.

## Documented rationale

The coding guide chooses a single store owner for consistency and explicitly distinguishes replaceable JSON snapshots from queryable durable data. Its recorded overlapping-container investigation motivates cautious initialization; it is not an Apple-confirmed explanation of framework internals.

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

Planned explanation path: `/cfa/explanations/persistence-boundaries`.
Not published or verified. Do not offer that path as a working link.
Use the local explanation directly until the catalogue contains a verified URL.
