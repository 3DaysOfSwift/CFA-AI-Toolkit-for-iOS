# CFA-SPEC-DEVICE-01: Share Model code across device targets

**Applies when:** Adding a widget or another device target.

**Strength:** Required with platform constraints.

**Guidance:** Include shared Model source and only the target’s own Views and ViewModels. Each process has its own AppModel and Features. Transfer immutable snapshots through a mechanism appropriate to the target. The receiving Feature refreshes its own observable state when its data source changes.

**Why:** Capabilities can be reused without assuming shared process memory.

**Example:** An iPhone app writes its App Group snapshot before requesting a widget timeline reload. The Watch receives a separate copy through Watch Connectivity.

**Verify:** Build each target and check membership and API availability. Verify the widget reload request follows the snapshot write. Test snapshot transfer and refresh on supported devices, including missing, unreadable, delayed or stale data.

**Full rule, context and examples:** [Use AppModel as the Composition Root and Feature Facade](../topics/17-use-appmodel-as-the-composition-root-and-feature-facade.md). This card is a reading aid; apply the complete canonical section.
