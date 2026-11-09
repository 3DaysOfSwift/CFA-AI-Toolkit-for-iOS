# CFA-SPEC-UI-04: Keep view construction and edits local

**Applies when:** Creating screens and editing saved values.

**Strength:** Required with product-specific behaviour.

**Guidance:** Keep blocking I/O, slow work and asynchronous side effects out of View initializers; a detail View may construct its own ViewModel from a selected immutable snapshot. Keep editable text in the screen ViewModel as a separate draft. Submit proposed edits to the responsible Feature. Retain the draft after a failed save and discard it when the user cancels editing.

**Why:** Screen creation remains predictable and cancelled edits do not change authoritative state.

**Example:** An unsaved weight field remains on screen after a failed save and is discarded by Cancel.

**Explanation:** [Why use recoverable editing workflows in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/honest-errors-and-editing).

**Verify:** Inspect View initialization for side effects. Fail a save and verify that the editor keeps the draft and the Feature keeps its last confirmed value. Verify that retry publishes the saved replacement only after persistence succeeds. Cancel an unsaved edit and verify it is discarded without a write.

**Full rule, context and examples:** [Keep Screen Initializers Clean](../topics/15-keep-screen-initializers-clean.md). This card is a reading aid; apply the complete canonical section.
