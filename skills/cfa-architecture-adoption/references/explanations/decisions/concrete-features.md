# Why CFA does not mirror every Feature with a protocol

Topic: `concrete-features`  
Rules: `CFA-API-01`  
Classification: cfa-choice  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

ViewModels depend on concrete Features. Do not generate matching FeatureAPI protocols; substitute the Feature's storage or provider dependency when testing.

## Problem

Mirrored protocols add another definition and maintenance point without a second implementation or meaningful boundary. Testing only a mocked Feature can avoid exercising the real Feature behaviour.

## Documented rationale

The specification rejects redundant Feature protocols and locates real substitution below the Feature. The coding guide requires every type to own a concrete responsibility.

## Trade-offs and alternatives

Editorial analysis: a concrete Feature can require more realistic test setup than a superficial mock. Lower-level doubles must be easy to assemble. Other architectures or public libraries may legitimately choose interface-level substitution.

## Scope and exceptions

The rule does not prohibit repository/provider protocols. Do not call protocols inherently bad Swift or remove a public compatibility contract merely to conform. Feature API in documentation means public methods and state.

## Verification

For each proposed protocol identify actual substitutable implementations and the behaviour it isolates. Verify ViewModel tests use a concrete Feature with controlled lower-level dependencies.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. That permission is not individual technical or historical approval.

## Open question

Document a minimal test example showing the real Feature plus a repository double, including failure—not just successful construction.

## Publication

[Read the public explanation](https://www.3daysofswiftconcurrency.com/cfa/explanation/concrete-features).
Verified on 2026-10-29 for topic relevance, anonymous access, readable code,
desktop/mobile layout and the training footer. The catalogue records the review
evidence. This dated verification does not imply that the page was checked today.
