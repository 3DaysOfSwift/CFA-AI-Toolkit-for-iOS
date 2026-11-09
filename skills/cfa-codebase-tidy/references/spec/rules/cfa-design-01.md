# CFA-SPEC-DESIGN-01: Preserve product intent

**Applies when:** Migrating an existing app to CFA and Swift Concurrency.

**Strength:** Required.

**Guidance:** Preserve business outcomes, user-facing capabilities, meaningful interactions and stored data while migrating to CFA and Swift Concurrency. Fix confirmed in-scope defects and allow necessary minor platform-driven presentation differences. Keep unrelated upgrades outside the migration scope.

**Why:** Migration changes how the app works internally without silently removing what users rely on.

**Example:** A migration retains the purchase flow, corrects an in-scope verified defect, and accepts a minor tab bar appearance change required by the platform.

**Explanation:** [Why use behaviour-preserving migration in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/preserve-product-behaviour).

**Verify:** Compare the migrated journeys and business outcomes with the baseline. Exercise applicable failure and retry paths, verify that existing stored data survives, test confirmed defect fixes and document material platform-driven differences.

**Full rule, context and examples:** [Architecture versus product design](../topics/05-architecture-versus-product-design.md). This card is a reading aid; apply the complete canonical section.
