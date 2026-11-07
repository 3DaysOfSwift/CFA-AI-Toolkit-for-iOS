# CFA-SPEC-LAUNCH-02: Never gate UI on database availability

**Applies when:** Launching when persistence is slow or unavailable.

**Strength:** Required.

**Guidance:** Start required work without blocking navigation or first presentation on a database loading gate.

**Why:** Users can access unaffected capabilities and see honest loading or failure states.

**Example:** The root screen appears while a Feature restores local data.

**Explanation:** [Why use recoverable storage requests in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/storage-failures).

**Verify:** Test slow and failed storage, navigation and first-frame responsiveness.

**Full rule, context and examples:** [Use Application Launch as an Opportunity to Refresh Features](../topics/21-use-application-launch-as-an-opportunity-to-refresh-features.md). This card is a reading aid; apply the complete canonical section.
