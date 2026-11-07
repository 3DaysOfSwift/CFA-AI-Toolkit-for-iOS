# CFA-SPEC-DEVICE-01: Share Model code across device targets

**Applies when:** Adding a widget or another device target.

**Strength:** Required with platform constraints.

**Guidance:** Include shared Model source and target-specific Views and ViewModels; each process has its own AppModel and Features.

**Why:** Capabilities can be reused without assuming shared process memory.

**Example:** An iPhone widget reads a shared App Group snapshot; a Watch receives a copy through Watch Connectivity.

**Verify:** Build each target, verify API availability and test snapshot transfer and updates.

**Full rule, context and examples:** [Use AppModel as the Composition Root and Feature Facade](../topics/17-use-appmodel-as-the-composition-root-and-feature-facade.md). This card is a reading aid; apply the complete canonical section.
