# CFA-SPEC-UI-01: Keep business decisions in the Model

**Applies when:** Creating or changing UI.

**Strength:** Required.

**Guidance:** Views render and forward intent. A reusable presentation component may receive an action closure that forwards intent to its owning screen and ViewModel. Features own domain decisions and authoritative state.

**Why:** A different device can reuse the same business capability.

**Example:** A weight screen forwards Save to its ViewModel, which calls the Feature. The Feature validates the value and saves it through its storage service.

**Explanation:** [Why use a UI and model boundary in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/presentation-boundaries).

**Verify:** Trace validation, calculations and persistence from the screen to their model owner.

**Full rule, context and examples:** [Maintain an Absolute UI and Model Boundary](../topics/13-maintain-an-absolute-ui-and-model-boundary.md). This card is a reading aid; apply the complete canonical section.
