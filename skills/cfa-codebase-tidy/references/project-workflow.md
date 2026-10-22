# CFA project workflow and design authority

CFA governs engineering boundaries, not a customer's visual identity. Read the
project's existing instructions and current request before applying toolkit
defaults. This policy takes precedence over template styling and design advice.

## Record the workflow once

Use an existing project instructions file (normally AGENTS.md); merge a small
section rather than replacing instructions. During authorised implementation,
record a mode when the user clearly establishes it:

- **New-product development:** creating and continuing to shape a new app.
- **Established-product maintenance:** maintaining, adopting CFA in, migrating
  or tidying an existing product whose design and behaviour should be preserved.

A suitable entry is `CFA workflow: new-product development` or
`CFA workflow: established-product maintenance`, followed by any important
user-approved design decisions. Do not create a new settings framework for this.

Creating the first files does not end new-product development. Do not infer a
switch from project age, a Git commit, a release number, or the existence of an
Xcode project. Respect a later explicit change of mode. Do not ask the user to
select the mode on every task. With no recorded mode or clear new-app intent,
use design-preserving maintenance behaviour and continue the requested work;
do not block it on a mode question. Read-only reviews never write this record.

## New-product development

App Creation covers both the initial scaffold and ongoing product shaping.
Use [new-app design defaults](new-app-design-defaults.md) where the user has
not supplied a design or made a different choice. These are starting points,
not permanent requirements or CFA conformance criteria.

Suggest relevant design ideas when the user is actively exploring that part
of the product. Do not repeatedly offer themes, footers, icons or branding.
Once the user chooses, declines, removes or replaces a default, respect that
decision in future work. Do not restore it on the next creation-skill invocation.
Record durable decisions briefly in existing project instructions when useful.

This mode is not blanket redesign permission. A request to fix a build, rename
a property, write tests or tidy code remains bounded to that request. Implement
requested UI changes; do not redesign unrelated screens. Reuse current features,
assets and design choices rather than re-scaffolding the app.

## Established-product maintenance

Preserve approved layouts, navigation, copy, branding, colours, theme choices,
Settings content, icons, interactions and accessibility behaviour. Feature work
fits the existing design system. Architecture adoption and concurrency migration
change implementation, not the product designer's decisions.

Never add, replace or repeatedly offer theme palettes, theme selectors, CFA
footers, branding or starter artwork during ordinary maintenance. Their absence
is not an architectural defect, a failed review or a reason to score CFA lower.
Do not require ThemeManager in a product that does not need selectable themes.
Repairing existing icon wiring is appropriate when it is part of the requested
fix; a missing icon does not authorize installing CFA branding.

Explicit requests can opt into individual changes, such as “add CFA footer to
Settings View” or “add colour themes”. Apply only that change, adapting it to
the existing design and preserving saved preferences and legal content.
Mentioning appearance or asking for one colour fix does not opt into the whole
new-app design package. Do not keep asking after an opt-in has been declined.

## Checks and conflicting instructions

Engineering requirements still apply: clear ownership, testable behaviour,
safe persistence, accessibility and honest errors. Separate a demonstrated
functional/accessibility defect from a stylistic preference; report an
out-of-scope defect with evidence, without using it as permission to redesign.
Follow explicit user requirements and project design decisions over defaults.
If a requested structural change cannot preserve behaviour, explain the
specific conflict and obtain direction before changing that behaviour.

Before delivery, compare the changed UI/behaviour with the baseline. Every
intentional visual or interaction change must follow the current request or
an applicable new-app default that the user has not overridden. Record any
unverified visual checks accurately. Do not use source checks as proof of an
unchanged rendered interface.
