# CFA-SPEC-OBS-01: Observe authoritative state

**Applies when:** Displaying shared model data.

**Strength:** Required.

**Guidance:** Expose observable Feature state while retaining a single owner; observation alone does not synchronize independent devices or processes.

**Why:** Views can update without creating competing domain state.

**Example:** A screen reads its ViewModel's computed property, which reads observable Feature state; the screen updates when that state changes.

**Verify:** Trace the observed property from its Feature owner to the displayed View.

**Full rule, context and examples:** [Use Observation Deliberately](../topics/23-use-observation-deliberately.md). This card is a reading aid; apply the complete canonical section.
