# CFA-SPEC-REVIEW-02: Avoid prohibited CFA patterns

**Applies when:** Implementing or auditing CFA code.

**Strength:** Required.

**Guidance:** Check the full prohibited-pattern list and its applicable context.

**Why:** Known architecture violations should not survive as isolated exceptions.

**Example:** A View does not receive another screen’s ViewModel.

**Verify:** Search source and target membership, then verify actual usage and tests.

**Full rule, context and examples:** [Prohibited Patterns](../topics/28-prohibited-patterns.md). This card is a reading aid; apply the complete canonical section.
