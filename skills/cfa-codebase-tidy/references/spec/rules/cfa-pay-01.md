# CFA-SPEC-PAY-01: Check paid capability entry points

**Applies when:** A product marks a capability paid.

**Strength:** Required when applicable.

**Guidance:** PurchasesFeature owns entitlement state. The screen ViewModel checks current entitlement before presenting or calling the paid capability and otherwise presents the locked or purchase experience. Apply the check at every relevant entry point. When a route bypasses a screen ViewModel, its caller checks current entitlement before invoking the capability. Keep pricing and entitlement checks out of the capability Feature. Server-protected operations enforce their own authorisation.

**Why:** Pricing changes remain separate from capability behaviour.

**Example:** An export screen checks PurchasesFeature before presenting or calling the paid export capability.

**Verify:** Establish which capabilities are paid from product requirements and entitlement policy. Trace every known entry point for paid presentation or execution, and test locked and entitled outcomes on alternate routes as well as the usual screen. Report confirmed unguarded paths with source evidence and their consequence. Mark unresolved paths unverified.

**Full rule, context and examples:** [Preserve One Authoritative Owner for Shared State](../topics/24-preserve-one-authoritative-owner-for-shared-state.md). This card is a reading aid; apply the complete canonical section.
