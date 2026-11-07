# CFA-SPEC-FLOW-02: Coordinate without unnecessary layers

**Applies when:** Implementing a feature workflow.

**Strength:** Required.

**Guidance:** Keep the cooperating parts connected by clear responsibilities and avoid bypassing the Feature that owns a business action.

**Why:** The execution path remains understandable and testable.

**Example:** A refresh reaches the schedule Feature before its provider.

**Explanation:** [Why use a UI and model boundary in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/presentation-boundaries).

**Verify:** Trace the entry point, owners, state changes and dependencies.

**Full rule, context and examples:** [Coordinated Application Flow](../topics/09-coordinated-application-flow.md). This card is a reading aid; apply the complete canonical section.
