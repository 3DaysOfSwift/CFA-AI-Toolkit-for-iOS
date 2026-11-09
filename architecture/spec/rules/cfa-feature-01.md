# CFA-SPEC-FEATURE-01: Define Features by capability

**Applies when:** Identifying domain ownership.

**Strength:** Required.

**Guidance:** Features represent business capabilities and own authoritative application state; do not generate a Feature simply for each screen.

**Why:** A Feature can serve multiple screens or targets.

**Example:** In the bundled Habit Tracker, HabitsFeature owns saved habits as a capability that multiple screens can use.

**Explanation:** [Why use cohesive features in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/feature-ownership).

**Related reading:** [Why use concrete features in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/concrete-features).

**Verify:** Map actual capabilities and state owners; check that screens consume the Features they need.

**Full rule, context and examples:** [Define Features by Business Capability, Not by Screen or Tab](../topics/16-define-features-by-business-capability-not-by-screen-or-tab.md). This card is a reading aid; apply the complete canonical section.
