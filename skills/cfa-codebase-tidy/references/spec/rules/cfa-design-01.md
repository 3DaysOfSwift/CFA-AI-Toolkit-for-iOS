# CFA-SPEC-DESIGN-01: Preserve product intent

**Applies when:** Creating, migrating or maintaining an app.

**Strength:** Required.

**Guidance:** Preserve business outcomes and capabilities while migrating to CFA and Swift Concurrency; fix confirmed in-scope defects and allow necessary minor platform-driven presentation differences without seeking unrelated modernisation.

**Why:** Migration changes how the app works internally without silently removing what users rely on.

**Example:** A migration retains the purchase flow while adopting a modern system tab bar and correcting a verified defect.

**Explanation:** [Why use behaviour-preserving migration in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/preserve-product-behaviour).

**Verify:** Compare the requested journey and business outcomes; test defect fixes and document material platform-driven differences.

**Full rule, context and examples:** [Architecture versus product design](../topics/05-architecture-versus-product-design.md). This card is a reading aid; apply the complete canonical section.
