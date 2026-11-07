# CFA-SPEC-MAINT-02: Avoid complexity without product value

**Applies when:** Adding an abstraction or migration layer.

**Strength:** Default.

**Guidance:** Keep structures simple enough to understand while preserving real behaviour and safety.

**Why:** Unnecessary layers obscure the system and increase maintenance cost.

**Example:** A small sign-out workflow makes explicit Feature calls instead of adding an event bus.

**Explanation:** [Why use descriptive names in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/readability).

**Verify:** Identify each layer’s concrete responsibility and remove unjustified duplication.

**Full rule, context and examples:** [Maintenance over Complexity](../topics/10-maintenance-over-complexity.md). This card is a reading aid; apply the complete canonical section.
