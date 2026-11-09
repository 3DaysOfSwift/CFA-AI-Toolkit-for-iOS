# CFA-SPEC-OBS-01: Observe authoritative state

**Applies when:** Displaying shared model data.

**Strength:** Required.

**Guidance:** Expose current observable Feature state through a single owner. On supported deployment targets, use `@Observable` for ViewModels and UI-observed Features. Keep Combine where compatibility or publisher composition requires it. Use `@Bindable` only when a control needs a writable binding. A computed ViewModel property can expose Feature state by reading the observable stored value. Use a separate event API where consumers must process every event. Observation alone does not synchronize independent devices or processes.

**Why:** Views can update without creating competing domain state.

**Example:** A screen reads its ViewModel's computed property, which reads observable Feature state; the screen updates when that state changes.

**Verify:** Trace the observed property from its Feature owner to the displayed View. When migrating event consumers, verify delivery of repeated values, ordering and cancellation separately from UI state updates.

**Full rule, context and examples:** [Use Observation Deliberately](../topics/23-use-observation-deliberately.md). This card is a reading aid; apply the complete canonical section.
