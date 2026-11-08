# CFA-SPEC-UI-04: Keep view construction and edits local

**Applies when:** Creating screens and editing saved values.

**Strength:** Required with product-specific behaviour.

**Guidance:** Keep blocking I/O, slow work and asynchronous side effects out of View initializers; a detail View may construct its own ViewModel from selected value data. The screen ViewModel owns unsaved text-field values until a save succeeds or the user cancels; retain the draft after a failed save.

**Why:** Screen creation remains predictable and cancelled edits do not change authoritative state.

**Example:** An unsaved weight field remains on screen after a failed save and is discarded by Cancel.

**Explanation:** [Why use recoverable editing workflows in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/honest-errors-and-editing).

**Verify:** Inspect initialization and test failed saves, retry and cancellation.

**Full rule, context and examples:** [Keep Screen Initializers Clean](../topics/15-keep-screen-initializers-clean.md). This card is a reading aid; apply the complete canonical section.
