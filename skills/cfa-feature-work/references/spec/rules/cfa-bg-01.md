# CFA-SPEC-BG-01: Feature-owned background capabilities

**Applies when:** Registering iOS background work.

**Strength:** Required when applicable.

**Guidance:** Features own their domain work and may register handlers synchronously during app startup; route system callbacks and satisfy expiration and completion contracts.

**Why:** System lifecycle handling stays separate from feature behaviour.

**Example:** AppModel asks a Feature to register an eligible system background handler during launch.

**Verify:** Verify task identifiers, launch registration, expiration, completion and actual device behaviour.

**Full rule, context and examples:** [Use AppModel as the Composition Root and Feature Facade](../topics/17-use-appmodel-as-the-composition-root-and-feature-facade.md). This card is a reading aid; apply the complete canonical section.
