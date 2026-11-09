# CFA-SPEC-BG-01: Feature-owned background capabilities

**Applies when:** Registering iOS background work.

**Strength:** Required when applicable.

**Guidance:** Each Feature owns its background capability. During synchronous startup, AppModel can ask the Feature to register its handlers. Register each permitted BGTaskScheduler identifier once before launch finishes and schedule work separately. Route app-level callbacks through AppModel to the responsible Feature and honour expiration, cancellation and system completion. Feature-owned work may outlive a screen. To continue after iOS backgrounds the app, use a supported system mechanism. An ordinary Swift Task grants no background runtime.

**Why:** System lifecycle handling stays separate from feature behaviour.

**Example:** AppModel asks a Feature to register an eligible system background handler during launch.

**Verify:** Verify permitted task identifiers and once-only launch registration. Check that scheduling is separate and that success, failure and expiration each complete the system callback once. Verify actual background execution on a supported device.

**Full rule, context and examples:** [Use AppModel as the Composition Root and Feature Facade](../topics/17-use-appmodel-as-the-composition-root-and-feature-facade.md). This card is a reading aid; apply the complete canonical section.
