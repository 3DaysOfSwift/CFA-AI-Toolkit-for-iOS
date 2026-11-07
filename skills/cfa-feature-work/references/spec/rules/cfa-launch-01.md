# CFA-SPEC-LAUNCH-01: Start the model synchronously

**Applies when:** Handling app launch.

**Strength:** Required.

**Guidance:** The app delegate calls AppModel startup synchronously; Features start asynchronous work without blocking launch on disk or network.

**Why:** App-wide startup signals are issued before the delegate returns.

**Example:** The application delegate calls AppModel startup directly; Features start their own asynchronous refreshes.

**Verify:** Inspect the launch callback, repeated launch guard and first-frame behaviour.

**Full rule, context and examples:** [Use Application Launch as an Opportunity to Refresh Features](../topics/21-use-application-launch-as-an-opportunity-to-refresh-features.md). This card is a reading aid; apply the complete canonical section.
