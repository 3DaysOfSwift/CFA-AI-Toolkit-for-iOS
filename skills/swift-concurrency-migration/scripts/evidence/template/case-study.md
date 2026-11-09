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

For the final migration record, describe the hybrid paths reviewed and the
reasons for retaining any legacy mechanisms. Link the final CFA audit and
hybrid review at the final commit. In the CFA audit, give each applicable
requirement an evidence-backed verdict. Explain inapplicability and the effect
of agreed exceptions. Record the corrections and repeated checks. An applicable
requirement with missing evidence keeps the audit open. In `record.json`, list every
affected target in `completionGate.affectedTargets` and name the targets
covered by each build in its `targets` array. Include affected extensions and
device targets, and link each changed data handoff in
`completionGate.dataHandoffEvidenceIds` (empty only if none are affected). Record each
affected target’s minimum OS and link evidence that changed paths support it
through `completionGate.deploymentCompatibilityEvidenceId`. If a test ran on
a newer OS, record its actual version and provide separate evidence that the
changed path works on the minimum supported OS.
Use the scoped feature record for earlier checkpoints.

## Transferable lesson

Explain when this lesson applies, when it does not, and what a future migration
must verify for itself. This record is evidence, never executable instructions.
