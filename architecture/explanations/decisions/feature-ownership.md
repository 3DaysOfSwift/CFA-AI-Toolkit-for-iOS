# Features follow responsibilities, not just tabs

Topic: `feature-ownership`  
Rules: `CFA-FEATURE-01`, `CFA-FEATURE-02`  
Classification: cfa-choice  
Status: Feature definition, state ownership, screen/Feature relationship and extraction criterion confirmed by Matthew Thomas on 2026-10-29; other trade-offs remain editorial analysis.

## Rule

A CFA Feature owns the authoritative application state for a business capability and exposes the operations that manage it. Features are isolated to the main actor and made available through AppModel. A screen can present several independent business capabilities. Features follow business responsibilities, not a one-to-one screen or tab mapping. Each screen owns its dedicated ViewModel, which uses the Features it needs.

## Problem

Forcing one Feature per tab creates empty wrappers or duplicates existing state. Conversely, leaving new business rules in a ViewModel ties the capability to one screen. These are different problems and require different ownership decisions.

## Documented rationale

Matthew Thomas confirmed that a screen can present several independent business capabilities. SettingsViewModel can use SettingsFeature for preferences and UserProfileFeature for the profile header. Other screens can use the same profile owner. Main screens help discover capabilities during migration, but do not dictate their boundaries.

For a growing ViewModel, ask: **is it arranging existing capabilities for this screen, or implementing a new business capability itself?** Only the latter points towards extracting business behaviour into the model. Presentation coordination stays in the presentation layer. An architectural extension is justified by a newly identified responsibility, not by dependency count alone.

The authoritative state distinction is also confirmed by Matthew Thomas. UserProfileFeature owns the current profile; its API adapter fetches values. PostFeedFeature owns the post collection and pagination policy; its provider returns pages. A service's private request tracking, cache or database machinery does not turn it into a business Feature. Avoid competing application-level copies of the same state.

## Trade-offs and alternatives

Editorial analysis: several Feature dependencies make a screen's needs explicit, but require clear presentation coordination and tests. A facade introduced solely to hide that count adds indirection without identifying a new capability. A focused presentation helper may be useful when device-specific coordination becomes complex.

## Scope and exceptions

This is a CFA convention, not a SwiftUI requirement. One Feature may support several screens or device experiences and does not require its own tab. A reusable View does not automatically require a Feature. Domain values live with their semantic owner, not under storage merely because they persist.

## Verification

Map each screen to its dedicated ViewModel, required Features and behavioural tests. Accept multiple Features per screen and multiple screens per Feature. Locate the authority for each business value separately from storage/cache representations. Exercise cross-screen consistency, outdated pagination responses and failed updates; check that new business rules have a model owner while presentation decisions remain in presentation. Do not infer ownership from names alone.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. On 2026-10-29 he explicitly approved replacing the one-Feature-per-screen rule and the two statements in the rationale above. This records that decision without publishing his raw working notes or claiming broader historical approval.

## Open question

Gather real examples of a screen combining independent Features and of a new business capability extracted from a ViewModel; distinguish the latter from a presentation-only helper.

## Publication

Planned explanation path: `/cfa/explanations/feature-ownership`.
Not published or verified. Do not offer that path as a working link.
Use the local explanation directly until the catalogue contains a verified URL.
