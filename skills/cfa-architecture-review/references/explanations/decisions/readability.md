# Names explain the work

Topic: `readability`  
Rules: `CFA-READ-01`, `CFA-READ-02`  
Classification: cfa-choice  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

Name values and capabilities for the information they convey. Prefer readable steps and earned types over shorter code, vague flags and deep object chains.

## Problem

A maintainer seeing isBusy cannot tell whether an app is saving, purchasing or refreshing. A short expression can hide several decisions and make an apparently cosmetic rename break a persisted key.

## Documented rationale

The governing principles explicitly prioritise maintenance and a reader's understanding over line count. The name scan requires inspecting callers and preserving external contracts, not replacing words mechanically.

## Trade-offs and alternatives

Editorial analysis: longer names cost space; intermediate values add lines. Keep concise local names when their scope makes the meaning obvious. Separate types still earn their place when they enforce different invariants, such as unvalidated input and validated data.

## Scope and exceptions

CFA naming conventions are not compiler requirements. Do not change wire keys, schema fields, bundle identifiers or product IDs as a cosmetic rename. Existing-product scope and compatibility still govern.

## Verification

Read a declaration without its implementation, then follow its callers. Explain the ambiguity a rename removes. Build affected targets and test saved-data/API compatibility where a contract may change.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. That permission is not individual technical or historical approval.

## Open question

Which naming changes have most reduced maintenance effort in a real team? Capture an approved concrete example rather than asserting measured productivity gains.

## Publication

[Read the public explanation](https://www.3daysofswiftconcurrency.com/cfa/explanation/readability).
Verified on 2026-10-29 for topic relevance, anonymous access, readable code,
desktop/mobile layout and the training footer. The catalogue records the review
evidence. This dated verification does not imply that the page was checked today.
