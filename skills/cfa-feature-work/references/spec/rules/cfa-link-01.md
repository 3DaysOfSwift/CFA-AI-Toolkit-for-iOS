# CFA-SPEC-LINK-01: Preserve deferred destinations

**Applies when:** Handling deep links or notification destinations.

**Strength:** Required when applicable.

**Guidance:** For new apps, DeepLinkingFeature records requests to open a URL or notification action, not scheduled or merely delivered notifications. Persist safe pending requests before confirming they are kept. The receiving scene owns navigation, and either scene can open a shared request. Coordinate competing opens and dismissals. Deduplicate repeated callbacks for the same opening event and keep separate events for the same destination distinct. Remove the request after successful navigation or explicit dismissal. Navigation succeeds when the scene opens the destination. Declining, cancelling before navigation or failing to navigate leaves the request pending. The destination loads its own content. If saving the removal fails after navigation, report the failure and retry removal without navigating again. The request may reappear after restart if the removal was never saved. New apps add a separate notification history or global navigation router only when the product requires one. Preserve existing deep-link, notification and history capabilities during migration.

**Why:** The user can keep editing without losing the destination.

**Example:** A launch notification remains pending when a user chooses to keep editing; opening its page removes the request.

[Run the deep-linking example](../examples/README.md).

**Verify:** Reject invalid destinations before saving. Force an initial save to fail and verify the caller receives the error without an unsaved request appearing in the pending list. Test request reception before restoration completes, preserving both the saved and new requests across restart. Verify that a delayed restore leaves an opened request removed and unrelated requests available. Force a read failure on an existing list and verify that receiving a request reports the error and preserves the file. After recovery, verify that retry retains both requests. Verify refusal, cancellation before and after navigation, competing opens, an open racing dismissal, and dismissal of one request while others remain. Verify that repeated callbacks for the same event do not reopen it and that a distinct event for the same destination remains available. Simulate a failed removal after navigation and verify that retry persists the removal without navigating again. Check that one scene opening a request leaves other scenes’ destinations unchanged.

**Full rule, context and examples:** [Keep Screen Initializers Clean](../topics/15-keep-screen-initializers-clean.md). This card is a reading aid; apply the complete canonical section.
