# CFA-SPEC-LINK-01: Preserve deferred destinations

**Applies when:** Handling deep links or notification destinations.

**Strength:** Required when applicable.

**Guidance:** DeepLinkingFeature owns validated pending requests; the receiving scene owns navigation. Remove a request after successful navigation or explicit dismissal.

**Why:** The user can keep editing without losing the destination.

**Example:** A launch notification remains pending when a user chooses to keep editing; opening its page removes the request.

[Run the deep-linking example](../examples/README.md).

**Verify:** Test durable restoration, refusal, successful navigation, multiple requests, storage failure and scene isolation.

**Full rule, context and examples:** [Keep Screen Initializers Clean](../topics/15-keep-screen-initializers-clean.md). This card is a reading aid; apply the complete canonical section.
