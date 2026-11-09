# CFA-SPEC-TASK-03: Retain ViewModel-owned unstructured tasks

**Applies when:** A ViewModel creates an unstructured Task.

**Strength:** Default.

**Guidance:** Retain a named handle for each independently managed unstructured operation the ViewModel creates. Reuse the active handle for equivalent actions when one execution satisfies each caller. Commands that must each take effect keep their own outcomes. Clear the handle after publishing the outcome on success, failure or cancellation. Framework-owned lifecycle tasks and structured children keep their existing owners.

**Why:** Task ownership and shared completion stay visible.

**Example:** Repeated refresh taps return the same active task handle.

**Explanation:** [Unstructured tasks need an owner—not a ban](https://www.3daysofswiftconcurrency.com/cfa/explanation/unstructured-tasks) · [Two callers. One refresh. No lost edits.](https://www.3daysofswiftconcurrency.com/cfa/explanation/overlapping-requests).

**Verify:** Test repeated taps, completion cleanup, cancellation and replacement.

**Full rule, context and examples:** [Make Concurrency Behaviour Honest and Visible](../topics/20-make-concurrency-behaviour-honest-and-visible.md). This card is a reading aid; apply the complete canonical section.
