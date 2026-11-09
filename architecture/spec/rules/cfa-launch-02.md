# CFA-SPEC-LAUNCH-02: Never gate UI on database availability

**Applies when:** Launching when persistence is slow or unavailable.

**Strength:** Required.

**Guidance:** Install stable root navigation independently of store availability. Initializers and AppModel.live() assemble dependencies. The storage owner opens the store lazily on a Feature request and prepares the configured parent directory before opening a file-backed store. The affected screen presents directory or opening errors and retries the same domain request through its ViewModel and Feature. Retry can attempt an open that never succeeded. Reuse a successfully opened store when a fetch fails. Preserve the configured location and existing data. An unsuccessful initial fetch must surface a failure, while a failed refresh preserves previously loaded data.

**Why:** Users can access unaffected capabilities and see honest loading or failure states.

**Example:** The root screen appears while a Feature restores local data.

**Explanation:** [Why use recoverable storage requests in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/storage-failures).

**Verify:** Hold store opening pending, then fail it. Verify the root stays visible, an unaffected destination remains accessible, and the affected screen explains the failure and can retry successfully without replacing the root or losing saved data. In a separate case, fail a fetch after opening and verify retry reuses the working store and preserves any prior results. Verify actual store opening and UI behaviour separately from controlled tests.

**Full rule, context and examples:** [Use Application Launch as an Opportunity to Refresh Features](../topics/21-use-application-launch-as-an-opportunity-to-refresh-features.md). This card is a reading aid; apply the complete canonical section.
