# CFA-SPEC-APP-02: Own application-wide listeners at AppModel

**Applies when:** An event must be observed independent of a screen.

**Strength:** Required when applicable.

**Guidance:** AppModel owns app-wide listener tasks and forwards events to the responsible Feature; screen-only observation stays with its screen or ViewModel.

**Why:** Lifetime follows the scope that requires the event.

**Example:** AppModel owns an app-wide purchase event listener and forwards updates to PurchasesFeature.

**Verify:** Verify listener startup, event forwarding, lifetime, cancellation and test isolation.

**Full rule, context and examples:** [Use AppModel as the Composition Root and Feature Facade](../topics/17-use-appmodel-as-the-composition-root-and-feature-facade.md). This card is a reading aid; apply the complete canonical section.
