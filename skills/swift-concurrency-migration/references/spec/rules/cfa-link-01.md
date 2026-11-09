# CFA-SPEC-LINK-01: Preserve deferred destinations

**Applies when:** Handling deep links or notification destinations.

**Strength:** Required when applicable.

**Guidance:** For new apps, DeepLinkingFeature records requests to open a URL or notification action, not scheduled or merely delivered notifications. Persist safe pending requests before confirming they are kept. The receiving scene owns navigation, and either scene can open a shared request. Coordinate competing opens. Remove the request after successful navigation or explicit dismissal. Navigation succeeds when the scene opens the destination. Declining, cancelling before navigation or failing to navigate leaves the request pending. The destination loads its own content. If saving the removal fails after navigation, report the failure and retry removal without navigating again. The request may reappear after restart if the removal was never saved. Preserve existing deep-link, notification and history capabilities during migration.

**Why:** The user can keep editing without losing the destination.

**Example:** A launch notification remains pending when a user chooses to keep editing; opening its page removes the request.

[Run the deep-linking example](../examples/README.md).

**Verify:** Test request reception before restoration completes, preserving both the saved and new requests across restart. Verify refusal, cancellation before and after navigation, competing opens, and dismissal of one request while others remain. Simulate a failed removal after navigation and verify that retry persists the removal without navigating again. Check that one scene opening a request leaves other scenes’ destinations unchanged.

**Full rule, context and examples:** [Keep Screen Initializers Clean](../topics/15-keep-screen-initializers-clean.md). This card is a reading aid; apply the complete canonical section.
