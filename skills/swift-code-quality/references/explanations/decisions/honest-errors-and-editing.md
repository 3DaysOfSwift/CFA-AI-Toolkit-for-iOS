# Keep edits visible and failures honest

Topic: `honest-errors-and-editing`  
Rules: `CFA-EDIT-01`, `CFA-ERROR-02`  
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

Test rapid edits, invalid intermediate input, failed persistence and retry. Verify the latest edit survives and that controls remain usable with larger text. Test behaviour, not just the absence of a Save label.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. That permission is not individual technical or historical approval.

## Open question

Choose a small approved inline-edit example showing failed persistence without losing the draft or visually dimming unrelated content.

## Publication

Planned explanation path: `/cfa/explanations/honest-errors-and-editing`.
Not published or verified. Do not offer that path as a working link.
Use the local explanation directly until the catalogue contains a verified URL.
