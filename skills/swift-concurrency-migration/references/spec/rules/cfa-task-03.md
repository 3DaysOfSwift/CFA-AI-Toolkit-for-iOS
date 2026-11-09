# CFA-SPEC-TASK-03: Retain ViewModel-owned unstructured tasks

**Applies when:** A ViewModel creates an unstructured Task.

**Strength:** Default.

**Guidance:** Retain a named handle for each independently managed unstructured operation the ViewModel creates. Reuse the active handle for equivalent actions when one execution satisfies each caller. Commands that must each take effect keep their own outcomes. Clear the handle after handling the outcome on success, failure or cancellation. If a replacement can start before the old task exits, use task identity to prevent stale results and clear the handle only when that identity still matches. Framework-owned lifecycle tasks and structured children keep their existing owners.

**Why:** Task ownership and shared completion stay visible.

**Example:** Repeated refresh taps return the same active ViewModel task handle. An async caller awaits its value when it needs completion. The Feature still coordinates equivalent requests from other screens.

**Explanation:** [Unstructured tasks need an owner—not a ban](https://www.3daysofswiftconcurrency.com/cfa/explanation/unstructured-tasks).

**Related reading:** [Two callers. One refresh. No lost edits.](https://www.3daysofswiftconcurrency.com/cfa/explanation/overlapping-requests).

**Verify:** Verify equivalent callers share one execution and observe its completion. Test cleanup after success, failure and cancellation. If replacement can occur before the old task exits, finish the old task after installing its replacement and verify it leaves the replacement handle and current state intact.

**Full rule, context and examples:** [Make Concurrency Behaviour Honest and Visible](../topics/20-make-concurrency-behaviour-honest-and-visible.md). This card is a reading aid; apply the complete canonical section.
