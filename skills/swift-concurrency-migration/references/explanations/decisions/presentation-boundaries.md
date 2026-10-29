# Business meaning belongs below the screen

Topic: `presentation-boundaries`  
Rules: `CFA-UI-01`, `CFA-STATE-01`  
Classification: cfa-choice  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

Features own reusable domain decisions and authoritative shared state. ViewModels own screen-specific presentation and drafts; Views render and report intent.

## Problem

If a screen calculates streak eligibility, a second UI must copy that calculation. If two ViewModels keep independently mutable copies of one persisted collection, they can disagree.

## Documented rationale

The specification's extraction test asks whether another UI could reuse the same capability without copying business rules. Separating retained data from request state also lets existing content remain visible when refresh fails.

## Trade-offs and alternatives

Editorial analysis: the extra boundary adds navigation between files and sometimes small forwarding methods. Its value must be an identifiable owner and reusable decision, not a layer for each expression.

## Scope and exceptions

Display wording, selection, focus and geometry remain presentation concerns. A stateless chart may receive a snapshot. 'Feature API' means the concrete Feature's public surface, not a mandatory protocol or additional runtime layer.

## Verification

Trace one user intention to its domain decision and persistence. Confirm a second consumer sees the same authoritative result. Fail a refresh and verify that previously loaded data remains available.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. That permission is not individual technical or historical approval.

## Open question

Which cross-platform reuse examples can we publish with measured scope? The specification's Watch exercise is a reasoning aid, not a delivery-time promise.

## Publication

[Read the public explanation](https://www.3daysofswiftconcurrency.com/cfa/explanation/presentation-boundaries).
Verified on 2026-10-29 for topic relevance, anonymous access, readable code,
desktop/mobile layout and the training footer. The catalogue records the review
evidence. This dated verification does not imply that the page was checked today.
