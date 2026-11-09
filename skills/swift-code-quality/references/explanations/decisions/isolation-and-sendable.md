# Isolation does not replace an operation policy

Topic: `isolation-and-sendable`  
Rules: `CFA-ISOLATION-01`, `CFA-SENDABLE-01`  
Classification: mixed  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

Keep ViewModels and Features on MainActor, put networking, persistence and expensive processing behind appropriately isolated services, send suitable values across boundaries, and inspect suspension points. Do not use unchecked annotations or detached tasks merely to silence diagnostics.

## Problem

A compiler-clean operation can still apply an obsolete result after an await. Marking a function async does not by itself prove expensive work leaves the UI actor. A shared singleton does not provide synchronization.

## Documented rationale

The specification separates actor isolation, immutable values, operation ordering and observation. CFA chooses main-actor Features owning authoritative application state, including capabilities with no current screen, with explicit workers where the work requires them. Lower-level services retain their own appropriate isolation for internal machinery; their mutable internals alone do not make them Features. Matthew Thomas confirmed this ownership distinction on 2026-10-29.

## Trade-offs and alternatives

Editorial analysis: explicit workers and value snapshots add conversion and testing work. Keep trivial coordination simple. Compiler settings and API isolation annotations matter; do not infer execution solely from syntax.

A networking actor serialises access to its own state. Once a request
suspends waiting for a response, another call can enter. Inspect synchronous
work before the request starts and any explicit waits or limits. A small
value wrapper can avoid a separate allocation for the wrapper, depending
on how it is stored. Copies can still share one configured URLSession.

## Scope and exceptions

Swift isolation and Sendable rules are language concepts; CFA's Feature/worker placement is an architectural choice. Respect the deployment target, language mode, default isolation and SDK in the actual project.

## Verification

Build with the real concurrency settings. Test stale completion separately from compiler diagnostics and measure expensive paths. Verify snapshots do not leak context-bound managed objects. For independent requests, hold one response open and verify the next request reaches the transport. Measure a suspected bottleneck before changing the wrapper.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. That permission is not individual technical or historical approval.

## Runnable examples

The migration playgrounds use Swift 5 language mode for their legacy examples and Swift 6 for the migrated examples; they target macOS. Their [guide](https://github.com/3DaysOfSwift/CFA-AI-Toolkit-for-iOS/tree/main/examples/migration) describes the settings and test command. Verify the actual project’s toolchain and deployment target separately.

## Publication

[Read the public explanation](https://www.3daysofswiftconcurrency.com/cfa/explanation/isolation-and-sendable).
Verified on 2026-10-29 for topic relevance, anonymous access, readable code,
desktop/mobile layout and the training footer. The catalogue records the review
evidence. This dated verification does not imply that the page was checked today.
