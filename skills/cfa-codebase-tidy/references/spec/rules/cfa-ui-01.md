# CFA-SPEC-UI-01: Keep business decisions in the Model

**Applies when:** Creating or changing UI.

**Strength:** Required.

**Guidance:** Views render and forward intent. A reusable presentation component may receive an action closure that forwards intent to its owning screen and ViewModel. Features own domain decisions and authoritative state.

**Why:** A different device can reuse the same business capability.

**Example:** A weight screen forwards Save to its ViewModel, which calls the Feature. The Feature validates the value and saves it through its storage service. A reusable RefreshButton can forward the tap through its action closure to the owning screen’s ViewModel.

**Explanation:** [Why use a UI and model boundary in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/presentation-boundaries).

**Verify:** Trace reusable component actions to the owning screen and its ViewModel. Verify that the component neither retains a ViewModel nor calls a Feature or service directly. Trace validation, calculations and persistence to their Model owner.

**Full rule, context and examples:** [Maintain an Absolute UI and Model Boundary](../topics/13-maintain-an-absolute-ui-and-model-boundary.md). This card is a reading aid; apply the complete canonical section.
