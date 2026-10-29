# Isolation does not replace an operation policy

Topic: `isolation-and-sendable`  
Rules: `CFA-ISOLATION-01`, `CFA-SENDABLE-01`  
Classification: mixed  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

Keep UI-observed state on its intended actor, send appropriate values across boundaries, and inspect suspension points. Do not use unchecked annotations or detached tasks merely to silence diagnostics.

## Problem

A compiler-clean operation can still apply an obsolete result after an await. Marking a function async does not by itself prove expensive work leaves the UI actor. A shared singleton does not provide synchronization.

## Documented rationale

The specification separates actor isolation, immutable values, operation ordering and observation. CFA chooses main-actor Features owning authoritative application state, including capabilities with no current screen, with explicit workers where the work requires them. Lower-level services retain their own appropriate isolation for internal machinery; their mutable internals alone do not make them Features. Matthew Thomas confirmed this ownership distinction on 2026-10-29.

## Trade-offs and alternatives

Editorial analysis: explicit workers and value snapshots add conversion and testing work. Keep trivial coordination simple. Compiler settings and API isolation annotations matter; do not infer execution solely from syntax.

## Scope and exceptions

Swift isolation and Sendable rules are language concepts; CFA's Feature/worker placement is an architectural choice. Respect the deployment target, language mode, default isolation and SDK in the actual project.

## Verification

Build with the real concurrency settings. Test stale completion separately from compiler diagnostics and measure expensive paths. Verify snapshots do not leak context-bound managed objects.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. That permission is not individual technical or historical approval.

## Open question

Which supported toolchain configurations should the first public examples cover? Document the exact settings beside runnable examples rather than promise one snippet works everywhere.

## Publication

Planned explanation path: `/cfa/explanations/isolation-and-sendable`.
Not published or verified. Do not offer that path as a working link.
Use the local explanation directly until the catalogue contains a verified URL.
