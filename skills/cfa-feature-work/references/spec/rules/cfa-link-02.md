# CFA-SPEC-LINK-02: Keep scene navigation independent

**Applies when:** Opening a link or notification in a multi-window app.

**Strength:** Required when applicable.

**Guidance:** Route each destination through a scene-appropriate handler without putting scene navigation state inside DeepLinkingFeature.

**Why:** A link should not unexpectedly redirect another window.

**Example:** A Settings screen asks the Feature to open its pending item in the receiving scene.

**Verify:** Verify that either scene can open a pending request and that simultaneous attempts on the same request navigate only once. Hold one scene’s navigation decision open and verify another scene can open a different request without consuming the first. A successful open removes the shared item while preserving the other scene’s navigation. Declined navigation or an unavailable scene leaves the request pending.

**Full rule, context and examples:** [Keep Screen Initializers Clean](../topics/15-keep-screen-initializers-clean.md). This card is a reading aid; apply the complete canonical section.
