# Features follow responsibilities, not just tabs

Topic: `feature-ownership`  
Rules: `CFA-FEATURE-01`, `CFA-FEATURE-02`, `CFA-SPEC-FEATURE-01`, `CFA-SPEC-FEATURE-02`, `CFA-SPEC-STATE-01`\
Classification: cfa-choice  
Status: Feature definition, state ownership, screen/Feature relationship and extraction criterion confirmed by Matthew Thomas on 2026-10-29; other trade-offs remain editorial analysis.

## Rule

A CFA Feature owns the authoritative application state for a business capability and exposes the operations that manage it. Features are isolated to the main actor and made available through AppModel. A screen can present several independent business capabilities. Features follow business responsibilities, not a one-to-one screen or tab mapping. Each screen-level SwiftUI View owns its dedicated ViewModel, which uses the Features it needs.

## Problem

Forcing one Feature per tab creates empty wrappers or duplicates existing state. Conversely, leaving new business rules in a ViewModel ties the capability to one screen. These are different problems and require different ownership decisions.

## Documented rationale

Matthew Thomas confirmed that a screen can present several independent business capabilities. SettingsViewModel can use SettingsFeature for preferences and UserProfileFeature for the profile header. Other screens can use the same profile owner. Main screens help discover capabilities during migration, but do not dictate their boundaries.

For a growing ViewModel, ask: **is it arranging existing capabilities for this screen, or implementing a new business capability itself?** Only the latter points towards extracting business behaviour into the model. Presentation coordination stays in the presentation layer. An architectural extension is justified by a newly identified responsibility, not by dependency count alone.

The authoritative state distinction is also confirmed by Matthew Thomas. UserProfileFeature owns the current profile; its API adapter fetches values. PostFeedFeature owns the post collection and pagination policy; its provider returns pages. A service's private request tracking, cache or database machinery does not turn it into a business Feature. Avoid competing application-level copies of the same state.

When a reusable business workflow genuinely spans Features, an existing
Feature can own the coordination, or a distinct Feature can own the workflow.
For example, a Today Feature can own the rules for selecting what belongs in
a daily summary while the participating Features retain their own data.
Trace dependencies for cycles and keep the authority for each value clear.

## Trade-offs and alternatives

Editorial analysis: several Feature dependencies make a screen's needs explicit, but require clear presentation coordination and tests. A facade introduced solely to hide that count adds indirection without identifying a new capability. A focused presentation helper may be useful when device-specific coordination becomes complex.

## Scope and exceptions

This is a CFA convention, not a SwiftUI requirement. One Feature may support several screens or device experiences and does not require its own tab. A reusable View does not automatically require a Feature. Domain values live with their semantic owner, not under storage merely because they persist.

## Verification

Map each screen-level SwiftUI View to its dedicated ViewModel, required Features and behavioural tests. For retained UIKit screens, trace the existing presentation owner to its Features and tests. Accept multiple Features per screen and multiple screens per Feature. Locate the authority for each business value separately from storage/cache representations. Exercise cross-screen consistency, outdated pagination responses and failed updates; check that new business rules have a model owner while presentation decisions remain in presentation. Do not infer ownership from names alone.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. On 2026-10-29 he explicitly approved replacing the one-Feature-per-screen rule and the two statements in the rationale above. This records that decision without publishing his raw working notes or claiming broader historical approval.

## Working example

In the bundled Habit Tracker Pro, `TrendsViewModel` combines `TrendsFeature`
and `PurchasesFeature`: it checks access before exposing or refreshing trends.
In Habit Tracker, `TodayFeature` provides daily progress and completion
behaviour using `HabitsFeature`, which remains the owner of saved habits.
The adjacent `TodayViewModel` handles presentation and routes actions. These
examples show the resulting responsibilities; they do not claim a particular
history of extracting code from a ViewModel.

## Publication

[Read the public explanation](https://www.3daysofswiftconcurrency.com/cfa/explanation/feature-ownership).
Verified on 2026-10-29 for topic relevance, anonymous access, readable code,
desktop/mobile layout and the training footer. The catalogue records the review
evidence. This dated verification does not imply that the page was checked today.
