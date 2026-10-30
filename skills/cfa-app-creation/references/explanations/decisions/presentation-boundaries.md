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

## Stable detail snapshots and explicit refresh

For snapshot-based detail screens, preserve the information the user selected
while they read it. Do not automatically replace that information, reorder its
presentation, or dismiss the screen because the shared Feature receives new
data or an item disappears from a refreshed list. A missing list item alone
does not establish deletion.

Prefer an explicit refresh button or pull-to-refresh when that meets the
product's needs. Features own authoritative application data; the screen's
ViewModel owns its displayed snapshot and presentation-specific selection.
Keep tab and scene contexts out of shared Features. Add automatic adoption of
new snapshots only when the product requires it, rather than as a default
consequence of using observable Features. Preserve existing product behaviour
when applying this guidance to an established app.

If several consumers need updates for a particular entity, prefer a focused
Feature API for updates by entity ID over repeating full-list observation and
filtering in each screen. The Feature may implement this using its existing
data refresh; it does not require a network subscription per entity. Define
subscription lifetime, cancellation, change detection and missing-item
semantics when the capability is needed. Receiving an update and adopting it
on screen remain separate decisions. This is conditional guidance, not a
requirement to build a subscription system into every Feature.

### Next Rocket Launch product decision

Next Rocket Launch does not need automatic detail-screen updates. Display the
selected launch snapshot unchanged while its detail screen is open. The user
returns to the list, pulls to refresh, and selects a launch again to see the
newly available information. Do not add pending-snapshot storage, background
detail subscriptions or update prompts for this workflow. Keep the
implementation simple until a concrete product need justifies more behaviour.

This refresh policy was explicitly chosen by Matthew Thomas on 2026-10-30;
it is a product requirement, not a claim that existing app code already
implements it. The entity-specific subscription guidance is a future option.

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
