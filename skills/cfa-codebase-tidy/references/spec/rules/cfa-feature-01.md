# CFA-SPEC-FEATURE-01: Define Features by capability

**Applies when:** Identifying domain ownership.

**Strength:** Required.

**Guidance:** Features represent business capabilities and own authoritative application state; do not generate a Feature simply for each screen.

**Why:** A Feature can serve multiple screens or targets.

**Example:** A Settings screen can use SettingsFeature and UserProfileFeature without creating a Feature just for the screen.

**Open-source code:** [Verbos](https://github.com/3DaysOfSwift/Verbos/blob/27ae6fe4f9f3e6b10355b09d0f05480d21e51e0a/Verbos/2%20-%20AppModel/Features/Today/TodayFeature.swift). Inspect the specific behaviour; these projects may also contain older conventions.

**Explanation:** [Why use cohesive features in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/feature-ownership) · [Why use concrete features in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/concrete-features).

**Verify:** Map actual capabilities and state owners; check that screens consume the Features they need.

**Full rule, context and examples:** [Define Features by Business Capability, Not by Screen or Tab](../topics/16-define-features-by-business-capability-not-by-screen-or-tab.md). This card is a reading aid; apply the complete canonical section.
