# CFA-SPEC-LINK-01: Preserve deferred destinations

**Applies when:** Handling deep links or notification destinations.

**Strength:** Required when applicable.

**Guidance:** For new apps, DeepLinkingFeature records requests to open a URL or notification action, not scheduled or merely delivered notifications. Persist safe pending requests before confirming they are kept. The receiving scene owns navigation, and either scene can open a shared request. Coordinate competing opens. Remove the request after successful navigation or explicit dismissal. Navigation succeeds when the scene opens the destination. Declined, cancelled or failed navigation leaves it pending. The destination loads its own content. Preserve existing deep-link, notification and history capabilities during migration.

**Why:** The user can keep editing without losing the destination.

**Example:** A launch notification remains pending when a user chooses to keep editing; opening its page removes the request.

[Run the deep-linking example](../examples/README.md).

**Verify:** Test request reception, durable restoration, refusal, successful navigation, multiple requests, storage failure and scene isolation.

**Full rule, context and examples:** [Keep Screen Initializers Clean](../topics/15-keep-screen-initializers-clean.md). This card is a reading aid; apply the complete canonical section.
