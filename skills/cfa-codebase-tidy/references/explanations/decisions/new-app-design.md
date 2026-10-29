# Defaults help a new app; they do not own its design

Topic: `new-app-design`  
Rules: `CFA-DESIGN-01`  
Classification: new-app-default  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

Use the approved themes, icon and Settings defaults as new-product starting points only when the developer has not chosen otherwise. Preserve later choices and do not repeatedly offer or restore declined defaults.

## Problem

An empty icon or unfinished Settings screen can make a starter feel incomplete, but imposing CFA branding on an established product violates its design authority.

## Documented rationale

The canonical workflow explicitly separates engineering boundaries from optional product styling. The defaults help initial creation while remaining replaceable by the product owner.

## Trade-offs and alternatives

Editorial analysis: opinionated starters reduce initial design decisions but cannot represent every brand, audience or accessibility need. A fixed theme count is a design choice, not evidence of architecture quality.

## Scope and exceptions

Do not count palettes, footers or starter artwork when scoring CFA conformance. Describe local storage or on-device AI in About content only when those capabilities are verified.

## Verification

Confirm the current workflow and approved design, then verify selected visuals, readable content and actual app metadata. A bounded fix does not authorize adding the whole design package.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. That permission is not individual technical or historical approval.

## Open question

Which defaults should remain in starter apps versus universal creation guidance? Revisit with actual user feedback, without assuming all teams want the same visual identity.

## Publication

Planned explanation path: `/cfa/explanations/new-app-design`.
Not published or verified. Do not offer that path as a working link.
Use the local explanation directly until the catalogue contains a verified URL.
