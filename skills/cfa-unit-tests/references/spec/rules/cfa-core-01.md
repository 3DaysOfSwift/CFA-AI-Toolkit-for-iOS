# CFA-SPEC-CORE-01: Apply CFA governing principles

**Applies when:** Building or reviewing a CFA app.

**Strength:** Required.

**Guidance:** Use the governing ownership, Swift Concurrency and readability principles together rather than applying one in isolation.

**Why:** Individual conventions are meaningful only as a coherent architecture.

**Example:** A shared Feature owns state and exposes operations to multiple dedicated ViewModels.

**Verify:** Review Feature boundaries, isolation and the full source principles.

**Full rule, context and examples:** [Governing Principles](../topics/08-governing-principles.md). This card is a reading aid; apply the complete canonical section.
