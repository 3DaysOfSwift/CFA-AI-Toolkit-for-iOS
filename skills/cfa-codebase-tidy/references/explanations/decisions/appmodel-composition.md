# One production graph, isolated test graphs

Topic: `appmodel-composition`  
Rules: `CFA-GRAPH-01`, `CFA-GRAPH-02`, `CFA-SPEC-LAUNCH-01`, `CFA-SPEC-APP-01`\
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

Scenes in the same process share one production graph so they can use the
same authoritative state. AppModel assembles the graph and coordinates its
lifecycle. Features own the business decisions.

The app delegate calls AppModel directly and synchronously so startup is
signalled during the delegate callback. Before the delegate returns, AppModel
invokes the relevant Feature startup methods and starts each required app-wide
listener once. AppModel forwards listener events to the responsible Feature.
Screen-only observation follows the screen or ViewModel lifetime.

Each Feature owns its asynchronous refresh and restoration work. The delegate
can return while that work is pending, so the first screen can appear without
waiting for disk or network completion. Task creation order alone gives no
guarantee about when either begins.

## Trade-offs and alternatives

Editorial analysis: convenient production access introduces a globally reachable entry point. Tests use isolated graphs; a normal preview constructs the View and uses its ordinary ViewModel and Feature dependencies. Account- or document-scoped products may require an additional ownership design rather than an assumed universal graph.

## Scope and exceptions

A singleton is not a concurrency mechanism. Isolation protects mutable state. Do not claim SwiftUI requires AppModel or one shared graph. Multiple live product contexts need an explicit design, not accidental extra AppModels.

Share Model source across device targets and include each target’s own
presentation. Separate processes have separate Feature instances. An iPhone
widget can read a snapshot from an App Group container, while a Watch app on
another device needs its own copy. The receiving Feature updates its state
when the snapshot reaches its data source.

## Verification

Trace live wiring, ensure dependencies are required by the explicit initializer, and run tests against independent graphs. Check that scenes in the same process share the graph. For an App Group widget
snapshot, verify that a successful write precedes the timeline reload request.
For a Watch handoff, verify on supported devices that the receiving Feature
updates when the transferred snapshot arrives. For app-wide listeners, call
startup twice with an isolated graph and a
controlled event source. Verify one listener starts, events reach the Feature
without a screen, and the test can end its listener. Inspect the actual
application callback to confirm it calls AppModel directly before returning.
A successful simulator launch alone does not establish that call path.
Measure first-frame timing separately from disk and network completion.

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
