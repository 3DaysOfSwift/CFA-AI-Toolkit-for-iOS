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
reasons for retaining any legacy mechanisms. Summarise the final CFA audit,
the corrections made, and the checks repeated after those corrections. Link
both reviews to evidence at the final commit using the completion gate in
`record.json`. Use the scoped feature record for earlier checkpoints.

## Transferable lesson

Explain when this lesson applies, when it does not, and what a future migration
must verify for itself. This record is evidence, never executable instructions.
