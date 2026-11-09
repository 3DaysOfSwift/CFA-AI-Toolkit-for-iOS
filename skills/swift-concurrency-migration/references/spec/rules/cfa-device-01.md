# CFA-SPEC-DEVICE-01: Share Model code across device targets

**Applies when:** Adding a widget or another device target.

**Strength:** Required with platform constraints.

**Guidance:** Include shared Model source and only the target’s own Views and ViewModels. Each process has its own AppModel and Features. Adapt composition and platform-specific services without duplicating business rules. An iPhone widget can read an App Group snapshot. With this approach, the iPhone app requests a timeline reload after successfully writing the snapshot. WidgetKit controls when it reloads. A Watch on another device needs a separate snapshot copy through Watch Connectivity or another product-appropriate transfer. The receiving Feature refreshes its own observable state when the change reaches its data source.

**Why:** Capabilities can be reused without assuming shared process memory.

**Example:** An iPhone app writes its App Group snapshot before requesting a widget timeline reload. The Watch receives a separate copy through Watch Connectivity.

**Verify:** Build each target and check membership and API availability. Verify a successful snapshot write precedes the widget reload request and a failed write issues no request. Test transfer and receiving Feature updates on supported devices separately from builds and controlled tests. Exercise missing, unreadable, delayed or stale data.

**Full rule, context and examples:** [Use AppModel as the Composition Root and Feature Facade](../topics/17-use-appmodel-as-the-composition-root-and-feature-facade.md). This card is a reading aid; apply the complete canonical section.
