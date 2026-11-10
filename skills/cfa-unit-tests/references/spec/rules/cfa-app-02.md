# CFA-SPEC-APP-02: Own application-wide listeners at AppModel

**Applies when:** An event must be observed independent of a screen.

**Strength:** Required when applicable.

**Guidance:** When the app needs an event regardless of which screen is visible, AppModel starts its listener once, retains its task handle when asynchronous, and forwards events to the responsible Feature. Define cancellation or replacement when the listener needs it. The Feature interprets events and owns the resulting state. Screen-only observation follows the lifetime of its screen or ViewModel.

**Why:** Lifetime follows the scope that requires the event.

**Example:** AppModel owns an app-wide purchase event listener and forwards updates to PurchasesFeature.

**Verify:** Drive a controlled event source after repeated startup signals. Verify one listener forwards each event to the responsible Feature with no relevant screen mounted. Where cancellation or replacement is supported, verify the old listener stops forwarding and cleanup cannot stop the replacement. Where both lifetimes are involved, leave the screen and verify that screen-only observation ends while app-wide events still reach the Feature. Shut down isolated listeners during test cleanup.

**Full rule, context and examples:** [Use AppModel as the Composition Root and Feature Facade](../topics/17-use-appmodel-as-the-composition-root-and-feature-facade.md). This card is a reading aid; apply the complete canonical section.
