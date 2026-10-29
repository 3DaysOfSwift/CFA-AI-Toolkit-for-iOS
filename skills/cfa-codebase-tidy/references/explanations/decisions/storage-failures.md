# A database failure must not replace the application

Topic: `storage-failures`  
Rules: `CFA-LAUNCH-01`, `CFA-ERROR-01`  
Classification: cfa-choice  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

Present the stable root interface independently of storage readiness. Open storage lazily within a data request and report failure through the owning Feature and screen, with intentional retry.

## Problem

An app-level launch-error gate makes Settings and unrelated capabilities disappear because one data operation failed. Treating failed loading as an empty collection hides the problem and risks destructive writes.

## Documented rationale

The specification explicitly confines the failure to the request that needs the data and keeps independent navigation usable. The storage owner—not the View—owns directory preparation and opening.

## Trade-offs and alternatives

Editorial analysis: feature screens must represent unavailable data, retry and cached content carefully. A visible shell does not mean every action is usable or that a required data migration can be skipped.

## Scope and exceptions

This is a CFA architecture requirement, not a limitation of SwiftUI. No destructive reset, changed store path or memory fallback is implied. Application lifecycle coordination may exist without database readiness becoming a launch gate.

## Verification

Fail the first real store-opening request, verify navigation and Settings remain usable, then retry. Separately fail refresh with existing content. Report unavailable runtime checks rather than equating a fake fetch with store-opening validation.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. That permission is not individual technical or historical approval.

## Open question

Which product-specific offline/error wording best communicates preserved data without promising recovery? Confirm per product, not as one universal message.

## Publication

[Read the public explanation](https://www.3daysofswiftconcurrency.com/cfa/explanation/storage-failures).
Verified on 2026-10-29 for topic relevance, anonymous access, readable code,
desktop/mobile layout and the training footer. The catalogue records the review
evidence. This dated verification does not imply that the page was checked today.
