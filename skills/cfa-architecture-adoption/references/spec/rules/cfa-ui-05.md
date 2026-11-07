# CFA-SPEC-UI-05: Keep presentation state out of Features

**Applies when:** Implementing navigation or display interactions.

**Strength:** Required.

**Guidance:** Keep screen-specific presentation, focus, selection and navigation within the presentation layer.

**Why:** Multiple scenes can present the same model independently.

**Example:** Two launch detail screens retain different selected snapshots.

**Explanation:** [Why use a UI and model boundary in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/presentation-boundaries).

**Verify:** Review independent windows and navigation while shared data updates.

**Full rule, context and examples:** [Maintain an Absolute UI and Model Boundary](../topics/13-maintain-an-absolute-ui-and-model-boundary.md). This card is a reading aid; apply the complete canonical section.
