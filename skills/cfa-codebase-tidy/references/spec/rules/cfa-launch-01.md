# CFA-SPEC-LAUNCH-01: Start the model synchronously

**Applies when:** Handling app launch.

**Strength:** Required.

**Guidance:** Call AppModel startup directly and synchronously from the application delegate callback. AppModel signals the relevant Features and starts its app-wide listeners before the callback returns. Features own their asynchronous work, and launch does not wait for disk or network completion.

**Why:** App-wide startup signals are issued before the delegate returns.

**Example:** The application delegate calls AppModel startup directly; Features start their own asynchronous refreshes.

**Verify:** Inspect the launch callback, repeated launch guard and first-frame behaviour.

**Full rule, context and examples:** [Use Application Launch as an Opportunity to Refresh Features](../topics/21-use-application-launch-as-an-opportunity-to-refresh-features.md). This card is a reading aid; apply the complete canonical section.
