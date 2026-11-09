# CFA-SPEC-DEVICE-01: Share Model code across device targets

**Applies when:** Adding a widget or another device target.

**Strength:** Required with platform constraints.

**Guidance:** Include shared Model source and only the target’s own Views and ViewModels. Each process has its own AppModel and Features. Adapt composition and platform-specific services without duplicating business rules. Share immutable snapshots that contain the data the receiving presentation needs. An iPhone widget can read an App Group snapshot. With this approach, the iPhone app requests a timeline reload after successfully writing the snapshot. WidgetKit controls when it reloads. A Watch on another device cannot read the iPhone’s App Group container. Transfer a separate snapshot through Watch Connectivity or another product-appropriate mechanism. The receiving Feature refreshes its observable state when the change reaches its data source. Observation publishes changes within the process. Transfer or synchronization carries them between processes or devices.

**Why:** Capabilities can be reused without assuming shared process memory.

**Example:** In the planned Next Rocket Launch showcase, the iPhone writes an App Group snapshot for its widget and then requests a timeline reload. The Watch countdown needs only the next launch, so the phone sends that small snapshot separately through Watch Connectivity. Transfer a larger snapshot file only when the Watch presentation needs it.

**Verify:** Build each target and check membership, API availability and lifecycle requirements. Verify a successful snapshot write precedes the widget reload request and a failed write issues no request. Test transfer and receiving Feature updates on supported devices separately from builds and controlled tests. Exercise missing, unreadable, delayed or stale data. When multiple targets can edit the same data, verify the product’s conflict policy.

**Full rule, context and examples:** [Use AppModel as the Composition Root and Feature Facade](../topics/17-use-appmodel-as-the-composition-root-and-feature-facade.md). This card is a reading aid; apply the complete canonical section.
