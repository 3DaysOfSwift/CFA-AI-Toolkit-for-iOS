# CFA-SPEC-FLOW-01: Keep the dependency flow explicit

**Applies when:** Designing or reviewing application structure.

**Strength:** Required.

**Guidance:** Keep dependencies directed from View to ViewModel to Feature. A Feature calls internal microservices as needed. AppModel composes and exposes Features.

**Why:** Dependencies follow clear ownership instead of scattered business decisions.

**Example:** A screen ViewModel asks a schedule Feature, which calls a networking microservice.

**Explanation:** [Why use a UI and model boundary in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/presentation-boundaries).

**Verify:** Trace a user operation to its owning Feature and any microservices it uses. Inspect for reverse dependencies.

**Full rule, context and examples:** [Layered Architecture](../topics/11-layered-architecture.md). This card is a reading aid; apply the complete canonical section.
