# CFA-SPEC-LAUNCH-03: Keep the SwiftUI App entry point structural

**Applies when:** Implementing the SwiftUI App entry point.

**Strength:** Required.

**Guidance:** Keep the App structure focused on scene composition and use the application lifecycle for the synchronous AppModel launch signal.

**Why:** Startup ownership remains independent of any one View.

**Example:** The app delegate invokes AppModel directly before returning from launch.

**Verify:** Inspect App.body, root navigation and the delegate. Verify a stable root per scene, no storage-dependent root branches, and a direct synchronous launch signal from the delegate. Screen lifecycle tasks may start their own work, while shared startup belongs to AppModel.

**Full rule, context and examples:** [Use Application Launch as an Opportunity to Refresh Features](../topics/21-use-application-launch-as-an-opportunity-to-refresh-features.md). This card is a reading aid; apply the complete canonical section.
