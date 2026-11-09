# Sharing requests and queueing commands

Topic: `overlapping-requests`  
Rules: `CFA-OVERLAP-01`, `CFA-OVERLAP-02`, `CFA-SPEC-TASK-01`\
Classification: mixed  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

A Feature independently defines how overlapping calls behave. Requests may share execution when one result satisfies every caller; commands that must each take effect need sequential whole-operation admission, even when their inputs match. Other policies require a product reason.

## Problem

ViewModel duplicate protection cannot cover another screen or Feature calling the same API. Mistaking required commands for duplicate requests drops work, even if their inputs match; actor isolation alone does not make a workflow atomic across suspension.

## Documented rationale

The specification places overlap policy at the shared capability boundary and distinguishes equivalence from queue admission. Each caller must receive the outcome of the work it requested.

## Trade-offs and alternatives

Editorial analysis: queues can increase latency and require cleanup after failure; coalescing needs precise keys. Latest-request-wins can be better for searches. Serializing unrelated work makes the entire app slower.

## Scope and exceptions

The choice is a CFA default informed by Swift reentrancy, not a universal FIFO promise from actors. Preserve the established product's ordering and cancellation semantics. Never await an operation from inside its own queue admission path.

## Verification

For queued commands, hold the first write at a controlled suspension point and
admit the next command. Verify that its write begins only after the first
finishes, and that both callers receive their own outcomes even if the first
fails. The bundled Serial Weight Saves migration example exercises this policy.
For equivalent requests, hold one provider call open while another caller joins.
Verify that the provider runs once and both callers can receive its outcome.
Check that cancellation of one waiter leaves shared work available to the others.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. That permission is not individual technical or historical approval.

## Open question

Collect real examples of equivalent requests with different caller cancellation needs; record the chosen policy and rejected alternatives only when actually considered.

## Publication

[Read the public explanation](https://www.3daysofswiftconcurrency.com/cfa/explanation/overlapping-requests).
Verified on 2026-10-29 for topic relevance, anonymous access, readable code,
desktop/mobile layout and the training footer. The catalogue records the review
evidence. This dated verification does not imply that the page was checked today.
