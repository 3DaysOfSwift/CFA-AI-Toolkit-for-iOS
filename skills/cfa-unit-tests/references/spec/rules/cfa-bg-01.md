# CFA-SPEC-BG-01: Feature-owned background capabilities

**Applies when:** Registering iOS background work.

**Strength:** Required when applicable.

**Guidance:** Each Feature owns its background capability. During synchronous startup, AppModel can ask the Feature to register its handlers. Register each permitted BGTaskScheduler identifier once before launch finishes and schedule work separately. Route app-level callbacks through AppModel to the responsible Feature and honour expiration and completion. Use a supported system mechanism for background runtime.

**Why:** System lifecycle handling stays separate from feature behaviour.

**Example:** AppModel asks a Feature to register an eligible system background handler during launch.

**Verify:** Verify task identifiers, launch registration, expiration, completion and actual device behaviour.

**Full rule, context and examples:** [Use AppModel as the Composition Root and Feature Facade](../topics/17-use-appmodel-as-the-composition-root-and-feature-facade.md). This card is a reading aid; apply the complete canonical section.
