# CFA-SPEC-PAY-01: Check paid capability entry points

**Applies when:** A product marks a capability paid.

**Strength:** Required when applicable.

**Guidance:** PurchasesFeature owns entitlement state; the ViewModel checks it before the capability is presented or called. A server protects its own operations.

**Why:** Pricing changes remain separate from capability behaviour.

**Example:** An export screen checks PurchasesFeature before presenting or calling the paid export capability.

**Verify:** Trace every known paid entry point and test locked and entitled outcomes.

**Full rule, context and examples:** [Preserve One Authoritative Owner for Shared State](../topics/24-preserve-one-authoritative-owner-for-shared-state.md). This card is a reading aid; apply the complete canonical section.
