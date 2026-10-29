# Sharing requests and queueing commands

Topic: `overlapping-requests`  
Rules: `CFA-OVERLAP-01`, `CFA-OVERLAP-02`  
Classification: mixed  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

A Feature independently defines how overlapping calls behave. Equivalent calls may share execution; distinct commands that must all run need sequential whole-operation admission. Other policies require a product reason.

## Problem

ViewModel duplicate protection cannot cover another screen or Feature calling the same API. Confusing different inputs with duplicate requests drops work; actor isolation alone does not make a workflow atomic across suspension.

## Documented rationale

The specification places overlap policy at the shared capability boundary and distinguishes equivalence from queue admission. Each caller must receive the outcome of the work it requested.

## Trade-offs and alternatives

Editorial analysis: queues can increase latency and require cleanup after failure; coalescing needs precise keys. Latest-request-wins can be better for searches. Serializing unrelated work makes the entire app slower.

## Scope and exceptions

The choice is a CFA default informed by Swift reentrancy, not a universal FIFO promise from actors. Preserve the established product's ordering and cancellation semantics. Never await an operation from inside its own queue admission path.

## Verification

Pause an operation at a controlled suspension point, admit another, then release in adverse order. Verify individual results, persisted order, failure recovery and no stranded waiters.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. That permission is not individual technical or historical approval.

## Open question

Collect real examples of equivalent requests with different caller cancellation needs; record the chosen policy and rejected alternatives only when actually considered.

## Publication

Planned explanation path: `/cfa/explanations/overlapping-requests`.
Not published or verified. Do not offer that path as a working link.
Use the local explanation directly until the catalogue contains a verified URL.
