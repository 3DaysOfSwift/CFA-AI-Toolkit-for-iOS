# Make ownership visible in the project

Topic: `project-structure`  
Rules: `CFA-PROJECT-01`, `CFA-PROJECT-02`  
Classification: cfa-choice  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

Use responsibility-named folders and consistent navigator membership. Keep domain values with their owner and verify generated app metadata in built outputs, not merely source settings.

## Problem

A generic Helpers folder hides ownership. A moved file can look correct on disk but be missing from a target. A template token left in built metadata makes an otherwise compiling starter incomplete.

## Documented rationale

The specification treats the folder map as a reading aid and the native template layout as a contract. It distinguishes visual navigator organization from evidence that the generated project works.

## Trade-offs and alternatives

Editorial analysis: a fixed convention requires maintaining template generators and project references. It should reduce navigation effort, not create speculative empty groups or unneeded package manifests.

## Scope and exceptions

CFA's folder names are conventions. Respect existing identifiers and requested deployment support. Package.swift is legitimate when the project actually uses a Swift package; its presence alone is not evidence of AI debris.

## Verification

Generate a project, inspect disk/navigator agreement and target membership, build Release and check concrete metadata. Layout testing and App Store eligibility remain separate checks.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. That permission is not individual technical or historical approval.

## Open question

Record a maintained decision rule for finished-task artifacts using actual references and recoverability, not a blanket deletion list.

## Publication

[Read the public explanation](https://www.3daysofswiftconcurrency.com/cfa/explanation/project-structure).
Verified on 2026-10-29 for topic relevance, anonymous access, readable code,
desktop/mobile layout and the training footer. The catalogue records the review
evidence. This dated verification does not imply that the page was checked today.
