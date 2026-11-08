## Architecture versus product design

Read [project workflow and design authority](../../project-workflow.md) before applying
this specification. Architecture rules define ownership and execution boundaries;
[new-app design defaults](../../new-app-design-defaults.md) define optional starting
visual choices. They must not turn migration, review or tidy-up into a redesign.

For migration, prioritise preserving the application's business behaviour and
user-facing capabilities while moving its implementation to CFA and Swift
Concurrency. Modernisation is not a separate migration objective: make changes
needed for the migration and supported platforms, not a search for unrelated
upgrades. Do not preserve a
confirmed defect merely because it was present in the old code: fix defects
within the migration scope, protect the intended behaviour with tests and
explain the correction. Preserve stored data and meaningful interactions.
Platform changes or necessary replacement of deprecated components may cause
minor visual or interaction differences; record
material differences rather than requiring pixel-identical results. Do not
silently remove capabilities, impose new-app defaults, or invent business rules.
Resolve genuinely ambiguous product decisions with the developer.

