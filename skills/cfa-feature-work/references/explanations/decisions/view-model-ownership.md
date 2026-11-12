# Why CFA screens own their ViewModels

Topic: `view-model-ownership`  
Rules: `CFA-SPEC-APP-03`, `CFA-SPEC-UI-02`, `CFA-SPEC-UI-03`, `CFA-SPEC-UI-07`\
Classification: cfa-choice  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

A CFA screen-level SwiftUI View owns its dedicated ViewModel in a private
`@State` property named `viewModel`. It constructs the ViewModel inline by default. A detail View may receive a selected immutable snapshot and construct its State-backed ViewModel in its initializer; ViewModels are never passed into Views. The ViewModel resolves narrow live Features and permits isolated Feature dependencies in tests.

## Problem

Passing a screen's backing object through parent Views spreads dependency plumbing and lets ancestors control presentation lifetimes. Starting work during View or ViewModel construction makes repeated construction observable.

## Documented rationale

The specification gives each screen-level SwiftUI View a local, testable presentation boundary. A screen can present several independent business capabilities, so its ViewModel may receive multiple narrow Feature dependencies. For a growing ViewModel, ask: is it arranging existing capabilities for this screen, or implementing a new business capability itself? Only the latter points towards extracting business behaviour into the model. Presentation reuse can stay in presentation helpers. Keep screen construction cheap and free of work-starting side effects.

A detail View’s selected value supplies the initial state for its ViewModel. SwiftUI keeps state by View identity, so changing an input does not automatically replace an existing ViewModel. Separate scene or destination identities must retain independent selections. Keep the displayed snapshot and navigation stable when the underlying list changes. Use explicit refresh where appropriate. Automatic detail updates need a product requirement. Construction must remain cheap: depending on the SwiftUI implementation, a replacement View value can construct a candidate ViewModel even when existing state is retained.

## Trade-offs and alternatives

Editor and destination initializers can run again as SwiftUI recreates View values. Keep ViewModel construction cheap and free of work-starting side effects.

## Scope and exceptions

This is a CFA convention for SwiftUI screens. When a migration retains a UIKit
screen, trace its actual presentation owner to its Features. Reusable presentation components may receive snapshots, bindings and action closures that report intent to their screen; they do not own the screen’s ViewModel or business rules. Do not replace two independent destinations with one shared selection just to remove parameters; unresolved destination/window identity requires an ownership decision before changing behaviour.

## Verification

Test ViewModels with isolated concrete Features. Inspect navigation, sheets and previews as well as declarations. Verify ownership and the property name separately. Open different destinations in two scenes and verify that each retains its own selection. Change the underlying list and verify that the open detail stays visible with its selected snapshot unless the product explicitly requires live updates.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. That permission is not individual technical or historical approval.

## Open question

For products that require live detail updates, decide how the destination
handles a changed or unavailable item while the user is viewing it.

## Publication

[Read the public explanation](https://www.3daysofswiftconcurrency.com/cfa/explanation/view-model-ownership).
Verified on 2026-10-29 for topic relevance, anonymous access, readable code,
desktop/mobile layout and the training footer. The catalogue records the review
evidence. This dated verification does not imply that the page was checked today.
