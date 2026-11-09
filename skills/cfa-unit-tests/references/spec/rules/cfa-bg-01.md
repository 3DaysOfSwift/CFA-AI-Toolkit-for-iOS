# CFA-SPEC-BG-01: Feature-owned background capabilities

**Applies when:** Registering iOS background work.

**Strength:** Required when applicable.

**Guidance:** Keep background work with the Feature that owns the business capability. Unrelated work stays with its respective owners. During synchronous startup, AppModel can ask each Feature to register its handlers. Register each permitted BGTaskScheduler identifier once before launch finishes. Schedule work separately and let the system decide when eligible work runs. Route app-level callbacks through AppModel to the responsible Feature and honour expiration, cancellation and system completion. Feature-owned work may outlive a screen. Continuing after iOS backgrounds the app requires a supported system mechanism, such as a background URLSession for eligible transfers. Background push delivery is best effort. An ordinary Swift Task grants no background runtime.

**Why:** System lifecycle handling stays separate from feature behaviour.

**Example:** AppModel asks a Feature to register an eligible system background handler during launch.

**Verify:** Verify permitted task identifiers and once-only launch registration. Check that scheduling is separate. Exercise success, failure and expiration individually and verify each completes the system callback exactly once. Verify that expiration cancels owned work. Then deliver expiration while normal completion is pending and verify the race still completes the callback exactly once. Record actual background execution on a supported device separately from controlled tests.

**Full rule, context and examples:** [Use AppModel as the Composition Root and Feature Facade](../topics/17-use-appmodel-as-the-composition-root-and-feature-facade.md). This card is a reading aid; apply the complete canonical section.
