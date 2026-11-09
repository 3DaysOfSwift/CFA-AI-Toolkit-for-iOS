# CFA-SPEC-LAUNCH-03: Keep the SwiftUI App entry point structural

**Applies when:** Implementing the SwiftUI App entry point.

**Strength:** Required.

**Guidance:** Compose scenes and app-wide presentation dependencies in App. Install a stable root View in each WindowGroup and keep root navigation structural. Keep stored AppModel references, database access and startup loading or error branches out of App. Signal AppModel synchronously through the application lifecycle.

**Why:** Startup ownership remains independent of any one View.

**Example:** The app delegate invokes AppModel directly before returning from launch.

**Verify:** Inspect App.body, root navigation and the delegate. Verify a stable root per scene, no startup gate in App or the root View, and a direct synchronous launch signal from the delegate. Screen lifecycle tasks may start their own work, while shared startup belongs to AppModel.

**Full rule, context and examples:** [Use Application Launch as an Opportunity to Refresh Features](../topics/21-use-application-launch-as-an-opportunity-to-refresh-features.md). This card is a reading aid; apply the complete canonical section.
