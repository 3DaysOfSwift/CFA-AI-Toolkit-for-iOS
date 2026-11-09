# CFA-SPEC-APP-02: Own application-wide listeners at AppModel

**Applies when:** An event must be observed independent of a screen.

**Strength:** Required when applicable.

**Guidance:** AppModel starts each app-wide listener once, retains its task handle when asynchronous, and forwards events to the responsible Feature. The Feature interprets events and owns the resulting state. Screen-only observation follows the lifetime of its screen or ViewModel.

**Why:** Lifetime follows the scope that requires the event.

**Example:** AppModel owns an app-wide purchase event listener and forwards updates to PurchasesFeature.

**Verify:** Test repeated startup signals, event forwarding with the relevant screen absent, cancellation or replacement when needed, and isolated test lifetimes.

**Full rule, context and examples:** [Use AppModel as the Composition Root and Feature Facade](../topics/17-use-appmodel-as-the-composition-root-and-feature-facade.md). This card is a reading aid; apply the complete canonical section.
