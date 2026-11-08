# CFA-SPEC-OBS-02: Keep unsaved field edits in the ViewModel

**Applies when:** Editing a simple text field.

**Strength:** Default.

**Guidance:** Keep the unsaved field value in the screen ViewModel until a save succeeds or the user cancels; retain it after a failed save. Persisted values remain Feature-owned.

**Why:** An abandoned edit does not become shared application state.

**Example:** A weight editor keeps the entered number after a failed save.

**Explanation:** [Why use recoverable editing workflows in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/honest-errors-and-editing).

**Verify:** Exercise save, failure, retry and Cancel without mutating the Feature early.

**Full rule, context and examples:** [Preserve One Authoritative Owner for Shared State](../topics/24-preserve-one-authoritative-owner-for-shared-state.md). This card is a reading aid; apply the complete canonical section.
