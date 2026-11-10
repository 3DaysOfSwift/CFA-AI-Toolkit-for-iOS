# A database failure must not replace the application

Topic: `storage-failures`  
Rules: `CFA-SPEC-LAUNCH-02`, `CFA-SPEC-PREF-01`\
Related canonical rules: `CFA-SPEC-ERROR-01`\
Classification: cfa-choice  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

Present the stable root interface independently of storage readiness. Open storage lazily within a data request and report failure through the owning Feature and screen, with intentional retry. If a recognised saved preference contains an obsolete
non-critical value, use the product’s safe fallback without interrupting the
user. For example, a retired colour theme can fall back to system appearance.

## Problem

An app-level launch-error gate makes Settings and unrelated capabilities disappear because one data operation failed. Treating failed loading as an empty collection hides the problem and risks destructive writes.

## Documented rationale

The specification explicitly confines the failure to the request that needs the data and keeps independent navigation usable. The storage owner handles directory preparation and opening. An obsolete theme
in a readable store is a compatibility case. Preserve the saved value where
appropriate until an intentional migration or a successful user choice
replaces it. Report unreadable or corrupt storage and failed writes through
the affected workflow.

## Trade-offs and alternatives

Editorial analysis: feature screens must represent unavailable data, retry and cached content carefully. A visible shell does not mean every action is usable or that a required data migration can be skipped.

## Scope and exceptions

This is a CFA architecture requirement, not a limitation of SwiftUI. No destructive reset, changed store path or memory fallback is implied. Application lifecycle coordination may exist without database readiness becoming a launch gate.

## Verification

Fail the first real store-opening request. Verify the affected screen explains
the failure while root navigation stays visible and Settings remains reachable.
Retry the same domain request through the Feature. Verify it recovers with
the same root and previously saved data. Separately fail a refresh and verify
that already loaded content remains usable. Report which runtime checks ran
and which were unavailable. A fake fetch establishes only the behaviour of
the layers it exercises.

Separately restore a retired theme from a valid store and check that system
appearance is applied without an error or an unintended write.

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
