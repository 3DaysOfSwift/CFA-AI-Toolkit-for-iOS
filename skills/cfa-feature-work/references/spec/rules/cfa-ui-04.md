# CFA-SPEC-UI-04: Keep view construction and edits local

**Applies when:** Creating screens and editing saved values.

**Strength:** Required with product-specific behaviour.

**Guidance:** Keep View initializers free of I/O and work; the screen ViewModel owns unsaved text-field values until Save or Cancel.

**Why:** Screen creation remains predictable and cancelled edits do not change authoritative state.

**Example:** An unsaved weight field remains on screen after a failed save and is discarded by Cancel.

**Explanation:** [Why use recoverable editing workflows in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/honest-errors-and-editing).

**Verify:** Inspect initialization and test failed saves, retry and cancellation.

**Full rule, context and examples:** [Keep Screen Initializers Clean](../topics/15-keep-screen-initializers-clean.md). This card is a reading aid; apply the complete canonical section.
