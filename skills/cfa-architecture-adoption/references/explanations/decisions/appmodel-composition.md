# One production graph, isolated test graphs

Topic: `appmodel-composition`  
Rules: `CFA-GRAPH-01`, `CFA-GRAPH-02`  
Classification: cfa-choice  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

AppModel.shared exposes one production Feature graph. Its explicit initializer receives Features; live() constructs dependencies. Tests build separate graphs and do not mutate the production singleton.

## Problem

Constructing unrelated graphs in different scenes can create conflicting owners and stores. A container that exposes every service also lets callers bypass Feature boundaries.

## Documented rationale

The specification explicitly chooses shared production composition to keep scenes connected to the same underlying state. It limits AppModel to Features and lifecycle coordination so composition does not become business logic.

## Trade-offs and alternatives

Editorial analysis: convenient production access introduces a globally reachable entry point. Tests and previews need deliberate isolation, and account- or document-scoped products may require an additional ownership design rather than an assumed universal graph.

## Scope and exceptions

A singleton is not a concurrency mechanism. Isolation protects mutable state. Do not claim SwiftUI requires AppModel or one shared graph. Multiple live product contexts need an explicit design, not accidental extra AppModels.

## Verification

Trace live wiring, ensure dependencies are required by the explicit initializer, and run tests against independent graphs. Check that adding a second scene does not silently open another store.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. That permission is not individual technical or historical approval.

## Open question

Which multi-account or document-scoped patterns should CFA officially support? Until documented, surface the conflict instead of claiming the singleton answers every product.

## Publication

[Read the public explanation](https://www.3daysofswiftconcurrency.com/cfa/explanation/appmodel-composition).
Verified on 2026-10-29 for topic relevance, anonymous access, readable code,
desktop/mobile layout and the training footer. The catalogue records the review
evidence. This dated verification does not imply that the page was checked today.
