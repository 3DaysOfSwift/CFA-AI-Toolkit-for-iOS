# Keep edits visible and failures honest

Topic: `honest-errors-and-editing`  
Rules: `CFA-SPEC-ERROR-01`, `CFA-SPEC-OBS-02`, `CFA-SPEC-UI-04`\
Classification: cfa-choice  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

Inline valid edits persist through their owner without a separate row Save button. Dedicated editors may retain a draft. Keep pending work and errors truthful, and avoid accidental crash paths.

## Problem

A tiny row Save button adds an unnecessary confirmation step. Disabling or fading an entire screen during every save disrupts editing; swallowing an error falsely claims a successful change.

## Documented rationale

The coding guide distinguishes inline changes from deliberate draft workflows, requires responsive input and preserved drafts on failure, and treats forced operations as explicit crash decisions.

## Trade-offs and alternatives

Editorial analysis: autosave needs input validation, write ordering and clear unsaved/error feedback. Not every intermediate text value is valid. A destructive or transactional editor can legitimately need explicit confirmation.

## Scope and exceptions

Preserve an existing product's approved interaction contract during maintenance. CFA's touch-target preference is not a quoted universal Apple metric. Do not introduce fatalError or fabricated success simply to remove a force unwrap.

## Verification

Test rapid edits, invalid intermediate input, failed persistence and retry.
On a failed durable save, verify that the editor retains the draft and that
the Feature and store retain the last confirmed value. A successful retry
publishes the replacement. Cancelling an unsaved edit discards the draft
while leaving the confirmed value intact. Check that the latest valid inline
edit survives and that controls remain usable with larger text.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. That permission is not individual technical or historical approval.

## Working example

The bundled Habit Tracker's `TodayView` binds each count field to its
`TodayViewModel`. The ViewModel retains an unsaved value after a failed write
and offers retry; `TodayViewModelTests` checks that confirmed progress stays
unchanged until the retry succeeds. The row displays its own save status and
retry control, without disabling the whole screen.

## Publication

[Read the public explanation](https://www.3daysofswiftconcurrency.com/cfa/explanation/honest-errors-and-editing).
Verified on 2026-10-29 for topic relevance, anonymous access, readable code,
desktop/mobile layout and the training footer. The catalogue records the review
evidence. This dated verification does not imply that the page was checked today.
