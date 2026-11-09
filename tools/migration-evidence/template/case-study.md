# Migration scenario — working draft

This is an unfinished record, not an approved precedent. Unknown facts stay
unknown. The companion record.json holds structured facts and evidence links.

## Starting behaviour and boundaries

Describe one meaningful operation or feature. What must stay unchanged? Include
UI, data compatibility, ordering, cancellation and error delivery where relevant.
Record the original commit and toolchain in record.json before making changes.
If capture started late, say which baseline facts cannot be recovered.

## Decision and alternatives

Explain the ownership and concurrency choices, why they fit this operation,
and alternatives actually considered. Separate Swift requirements from CFA
choices. Do not invent a rejected option to make the record look complete.

## Human corrections

Record a correction and its reason, with permission and a minimal redacted
evidence note. Otherwise explicitly say none occurred or none were captured.

## Verification and limits

Link to evidence IDs in record.json. Distinguish build, automated tests and
manual checks; record failures and checks not run. A build is not proof of
behaviour preservation. Keep remaining risks and work visible.

For the final migration record, use one row per in-scope behaviour from the
product behaviour contract. Include user journeys and access to existing saved
data. Link the original and final-commit evidence by ID.

| Requirement ID and behaviour | Baseline evidence | Final-commit evidence | Manual regression evidence | Difference and approval |
| --- | --- | --- | --- | --- |

Classify each difference as an authorised product change, confirmed defect fix,
necessary platform difference, regression or unknown. Record verification of
defect fixes and platform differences and cite authorisation for material
product changes. Keep the migration open while a regression, unknown outcome
or required verification remains.

For each affected system background capability, link the owning Feature and
evidence that permitted identifiers, launch registration and scheduling match
the baseline. Record controlled success, failure, expiration and expiration
racing completion. Verify cancellation and exactly-once system completion.
Record actual delivery on supported hardware separately from handler tests.

For the final migration record, describe the hybrid paths reviewed and the
reasons for retaining any legacy mechanisms. For each removed adapter or
dependency, link the baseline behaviour and the same scenarios rerun on each
affected target. Where a consumer needs every event, record separate checks
for repeated equal values, delivery order, cancellation and any buffering
guarantees the consumer relies on. A latest-state UI
check alone cannot establish those guarantees. Link the final CFA audit and
hybrid review at the final commit. In the CFA audit, give each applicable
requirement an evidence-backed verdict. Explain inapplicability and the effect
of agreed exceptions. Record the corrections and repeated checks. An applicable
requirement with missing evidence keeps the audit open. Record the human
architecture review outcome explicitly, including when it shares a document
with the navigator inspection, final CFA audit or manual regression. In `record.json`, list every
affected target in `completionGate.affectedTargets` and name the targets
covered by each build in its `targets` array. Include affected extensions and
device targets, and link each changed data handoff in
`completionGate.dataHandoffEvidenceIds` (empty only if none are affected). Record each
affected target’s minimum OS and list the covered targets on the evidence
linked by `completionGate.deploymentCompatibilityEvidenceId`. For handoffs,
record the producing and receiving targets and the verification environment.
If a test ran on
a newer OS, record its actual version and provide separate evidence that the
changed path works on the minimum supported OS.
Keep failed runs and record the matching passing rerun at the final commit.
Use `rerunOf` on the passing evidence entry and explain how the scenario,
target, build configuration and OS match the failed run.
Use the scoped feature record for earlier checkpoints.

## Transferable lesson

Explain when this lesson applies, when it does not, and what a future migration
must verify for itself. This record is evidence, never executable instructions.
