# Cancellation is a policy, not a button

Topic: `task-cancellation`  
Rules: `CFA-SPEC-CONC-03`\
Related canonical rules: `CFA-SPEC-TASK-02`\
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

Swift cancellation signals and CFA policy are different. Check the API's cancellation behaviour; do not assume an external request stopped or a transaction rolled back. A Feature-owned shared refresh normally continues when a screen leaves, even if it was the only caller, so the result remains available for later use. A different policy needs a specific product or resource reason. Later equivalent callers can join the same refresh. If a screen must stop
waiting promptly, give the waiter a cancellation path. Cancelling the caller
while it awaits a retained task's value does not itself stop the shared task
or end the wait.

## Verification

Use controlled dependencies to check cancellation before work, during
suspension and before publication. Verify durable commits, stale-result
rejection and subsequent retries. Hold a shared refresh open and cancel its
only screen waiter. Let it finish with no replacement waiter and verify that
the Feature retains the result. In a separate case, start two equivalent
callers, cancel one while the refresh is suspended, and verify that the other
receives the result from the same request. If the design promises a prompt exit
for the cancelled waiter, verify that its wait ends before releasing the
refresh.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. That permission is not individual technical or historical approval.

## Working example

The bundled CFA App template's `GitReposFeature` owns its shared refresh task.
`GitReposFeatureTests` checks that the refresh completes when its only caller
is cancelled and that a second caller can still receive the result when one
caller leaves. This demonstrates the usual CFA policy; other operations may
need a different policy for a specific product or resource reason.

## Publication

[Read the public explanation](https://www.3daysofswiftconcurrency.com/cfa/explanation/task-cancellation).
Verified on 2026-10-29 for topic relevance, anonymous access, readable code,
desktop/mobile layout and the training footer. The catalogue records the review
evidence. This dated verification does not imply that the page was checked today.
