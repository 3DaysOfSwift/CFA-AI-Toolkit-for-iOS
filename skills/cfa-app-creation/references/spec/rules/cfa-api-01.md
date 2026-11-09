# CFA-SPEC-API-01: Use readable Feature commands

**Applies when:** Designing a Feature API.

**Strength:** Required.

**Guidance:** Expose domain-oriented operations and values instead of deep storage graphs or generic mechanics.

**Why:** Callers can understand what a capability does from its API.

**Example:** A weight Feature exposes a named operation to save an entry.

**Explanation:** [Why use descriptive names in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/readability).

**Related reading:** [Why use cohesive features in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/feature-ownership) · [Why use concrete features in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/concrete-features).

**Verify:** Read call sites and check they do not manipulate repositories or nested implementation state.

**Full rule, context and examples:** [Organize Behaviour into Cohesive Features](../topics/18-organize-behaviour-into-cohesive-features.md). This card is a reading aid; apply the complete canonical section.
