# CFA-SPEC-LAUNCH-02: Never gate UI on database availability

**Applies when:** Launching when persistence is slow or unavailable.

**Strength:** Required.

**Guidance:** Install stable root navigation independently of store availability. Initializers and AppModel.live() assemble dependencies. The storage owner opens the store lazily on a Feature request. The affected screen presents errors and retries through its ViewModel and Feature.

**Why:** Users can access unaffected capabilities and see honest loading or failure states.

**Example:** The root screen appears while a Feature restores local data.

**Explanation:** [Why use recoverable storage requests in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/storage-failures).

**Verify:** Hold store opening pending, then fail it. Verify the root stays visible, an unaffected destination remains accessible, and the affected screen explains the failure and can retry successfully without replacing the root or losing saved data. Verify actual store opening and UI behaviour separately from controlled tests.

**Full rule, context and examples:** [Use Application Launch as an Opportunity to Refresh Features](../topics/21-use-application-launch-as-an-opportunity-to-refresh-features.md). This card is a reading aid; apply the complete canonical section.
