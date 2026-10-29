# Cancellation is a policy, not a button

Topic: `task-cancellation`  
Rules: `CFA-CANCEL-01`  
Classification: mixed  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

Choose cancellation according to the operation's purpose: durable mutation, replaceable query, presentation-only work or long-lived observation. Prevent cancelled obsolete work from publishing over newer results.

## Problem

Cancelling every operation when a screen disappears can lose a save. Never cancelling obsolete search work can publish an old result. Cancelling one waiter can also disrupt shared work another caller needs.

## Documented rationale

The specification explicitly separates these lifetimes and says cancellation is cooperative. Ownership exists to make the policy deliberate, not to mandate cancelling everything.

## Trade-offs and alternatives

Editorial analysis: continuing durable work consumes resources after presentation ends; cancellation and retry can require careful idempotency and error handling. Cancellation does not undo an already committed external effect.

## Scope and exceptions

Swift cancellation signals and CFA policy are different. Check the API's cancellation behaviour; do not assume an external request stopped or a transaction rolled back. Shared waiters need a documented ownership policy.

## Verification

Cancel before work, during suspension and before publication. Verify durable commits, individual waiter outcomes, stale-result rejection and subsequent retries using controlled dependencies.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. That permission is not individual technical or historical approval.

## Open question

Agree on a reusable shared-waiter cancellation example before prescribing one implementation across all Features.

## Publication

[Read the public explanation](https://www.3daysofswiftconcurrency.com/cfa/explanation/task-cancellation).
Verified on 2026-10-29 for topic relevance, anonymous access, readable code,
desktop/mobile layout and the training footer. The catalogue records the review
evidence. This dated verification does not imply that the page was checked today.
