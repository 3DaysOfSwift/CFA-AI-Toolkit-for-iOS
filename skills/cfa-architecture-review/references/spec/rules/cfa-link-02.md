# CFA-SPEC-LINK-02: Keep scene navigation independent

**Applies when:** Opening a link or notification in a multi-window app.

**Strength:** Required when applicable.

**Guidance:** Route each destination through a scene-appropriate handler without putting scene navigation state inside DeepLinkingFeature.

**Why:** A link should not unexpectedly redirect another window.

**Example:** A Settings screen asks the Feature to open its pending item in the receiving scene.

**Verify:** Test two scenes, declined navigation and unavailable destination handling.

**Full rule, context and examples:** [Keep Screen Initializers Clean](../topics/15-keep-screen-initializers-clean.md). This card is a reading aid; apply the complete canonical section.
