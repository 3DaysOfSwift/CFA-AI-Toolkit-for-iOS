# Modernising implementation is not redesign permission

Topic: `preserve-product-behaviour`  
Rules: `CFA-SCOPE-01`, `CFA-SCOPE-02`  
Classification: cfa-choice  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

Adoption, migration and tidy-up preserve the established product's behaviour and visual decisions. Apply only explicitly requested changes; keep new-product defaults out of maintenance conformance.

## Problem

A technically tidy migration can still break the app by changing navigation, cancellation, data formats or a designer's UI. Repeatedly suggesting themes and branding makes the tool intrusive.

## Documented rationale

The workflow policy gives product design authority to the developer and scopes each task. It distinguishes a demonstrated functional/accessibility defect from an optional stylistic preference.

## Trade-offs and alternatives

Editorial analysis: preserving a legacy contract can make implementation less elegant and require temporary adapters. Record the conflict and obtain direction rather than silently simplify away behaviour.

## Scope and exceptions

New-product development allows product shaping within the current request, not unrelated redesign. A migration evidence record is opt-in and is not permission to publish private code or case material.

## Verification

Record a before/after behaviour contract, include ordering and data compatibility, and compare relevant manual journeys. Treat a successful build as necessary evidence, not proof of unchanged behaviour.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. That permission is not individual technical or historical approval.

## Open question

Use approved migration evidence to explain real trade-offs. Do not cite a synthetic fixture, incomplete pilot or private chat as a proven public case study.

## Publication

Planned explanation path: `/cfa/explanations/preserve-product-behaviour`.
Not published or verified. Do not offer that path as a working link.
Use the local explanation directly until the catalogue contains a verified URL.
