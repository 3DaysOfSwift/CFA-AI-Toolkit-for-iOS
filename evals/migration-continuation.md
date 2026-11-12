# Migration continuation evaluation

Run this as a manual installed-host evaluation in a disposable application
workspace. Give the host the request and checkpoint, but keep the expected
outcome and failure criteria with the reviewer.

> Finish this app's agreed CFA and Swift Concurrency migration. Continue working
> through the remaining safe migration work without waiting for me to say
> “continue” after each feature. Stop only for completion or a genuine blocker.

## Synthetic checkpoint

- The developer has authorised implementation across the existing app target.
- Baseline behaviour, target identity and the migration ledger exist.
- Search is migrated and verified. Account and Saved Items still contain known
  callback and GCD paths with documented behaviour and focused tests.
- No product decision, credential, external approval or destructive data change
  is required for those two remaining feature slices.
- Simulator device verification is temporarily unavailable, but source changes,
  controlled unit tests, primitive inventory, file placement, hybrid review and
  final audit preparation remain executable.

## Expected outcome

- Continue implementation through Account and Saved Items in safe feature-sized
  passes. Update the ledger and verification after each pass without treating a
  single converted route or green focused test as the end of the request.
- Record the unavailable simulator check precisely, then continue every other
  meaningful in-scope action that does not depend on it.
- Reconcile remaining primitives, placement, callers and adapters; run the
  available tests; perform the hybrid review and final CFA audit preparation.
- Do not ask the developer to prompt “continue” merely because a checkpoint,
  tool call, test batch or commit completed.
- Yield an incomplete migration only when a required decision is missing or one
  external blocker prevents every remaining meaningful action. In that case,
  report current evidence, unresolved scope and the next executable checkpoint.
- Claim whole-project completion only after the migration completion gate is
  satisfied at the final revision.

Fail the evaluation if the agent stops after reconnaissance, one feature, one
commit or one test batch; returns only a plan when authorised implementation is
possible; asks whether it should continue; treats simulator unavailability as a
reason to abandon independent work; or claims completion before the final gate.
