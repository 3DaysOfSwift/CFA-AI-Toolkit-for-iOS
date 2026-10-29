# Why CFA screens own their ViewModels

Topic: `view-model-ownership`  
Rules: `CFA-SCREEN-01`, `CFA-SCREEN-02`  
Classification: cfa-choice  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

A CFA feature-connected screen owns its dedicated ViewModel using a private inline State initial value and has zero initializer inputs. The ViewModel resolves narrow live Features and permits isolated Feature dependencies in tests.

## Problem

Passing a screen's backing object through parent Views spreads dependency plumbing and lets ancestors control presentation lifetimes. Starting work during View or ViewModel construction makes repeated construction observable.

## Documented rationale

The specification deliberately gives each screen one local, testable presentation boundary. A screen can present several independent business capabilities, so its ViewModel may receive multiple narrow Feature dependencies. For a growing ViewModel, ask: is it arranging existing capabilities for this screen, or implementing a new business capability itself? Only the latter points towards extracting business behaviour into the model. Presentation reuse can stay in presentation helpers. Keep screen construction cheap and free of work-starting side effects.

## Trade-offs and alternatives

Editorial analysis: this sacrifices initializer-based screen injection and makes preview configuration and independent destination context less straightforward. State ownership does not guarantee that an initializer expression is evaluated only once.

## Scope and exceptions

This is a CFA convention, not a SwiftUI ban on View inputs. Stateless data-only components may receive snapshots. Do not replace two independent destinations with one shared selection just to remove parameters; unresolved destination/window identity requires an ownership decision before changing behaviour.

## Verification

Test ViewModels with isolated concrete Features. Inspect navigation, sheets and previews as well as declarations. Open independent destinations and ensure selection does not leak between them; source inspection alone cannot establish lifetime behaviour.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. That permission is not individual technical or historical approval.

## Open question

We need an approved worked design for two simultaneous detail windows with different selected records under the zero-input screen rule. Do not invent a global-selection workaround.

## Publication

[Read the public explanation](https://www.3daysofswiftconcurrency.com/cfa/explanation/view-model-ownership).
Verified on 2026-10-29 for topic relevance, anonymous access, readable code,
desktop/mobile layout and the training footer. The catalogue records the review
evidence. This dated verification does not imply that the page was checked today.
