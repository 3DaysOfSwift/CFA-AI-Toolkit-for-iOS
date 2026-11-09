# One production graph, isolated test graphs

Topic: `appmodel-composition`  
Rules: `CFA-GRAPH-01`, `CFA-GRAPH-02`  
Classification: cfa-choice  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

`AppModel.shared` exposes one production Feature graph per running process.
The single `live()` factory constructs production dependencies. The explicit
initializer assigns the supplied Features, sets the launch guard to `false`,
and sets any app-wide listener task handles to `nil`. Tests supply isolated
Features to that initializer.

## Problem

Constructing unrelated graphs in different scenes can create conflicting owners and stores. A container that exposes every service also lets callers bypass Feature boundaries.

## Documented rationale

The specification explicitly chooses shared production composition to keep scenes connected to the same underlying state. It limits AppModel to Features and lifecycle coordination so composition does not become business logic. The app delegate calls AppModel directly and synchronously at startup. AppModel signals Features and starts its app-wide listeners. It forwards each listener event to the responsible Feature, which owns the business response.

## Trade-offs and alternatives

Editorial analysis: convenient production access introduces a globally reachable entry point. Tests use isolated graphs; a normal preview constructs the View and uses its ordinary ViewModel and Feature dependencies. Account- or document-scoped products may require an additional ownership design rather than an assumed universal graph.

## Scope and exceptions

A singleton is not a concurrency mechanism. Isolation protects mutable state. Do not claim SwiftUI requires AppModel or one shared graph. Multiple live product contexts need an explicit design, not accidental extra AppModels.

## Verification

Trace live wiring, ensure dependencies are required by the explicit initializer, and run tests against independent graphs. Check that scenes in the same process share the graph. A widget or Watch app running in a separate process has its own graph and uses the product’s data-sharing mechanism. For app-wide listeners, verify that AppModel owns the task lifetime and forwards events to the Feature.

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
