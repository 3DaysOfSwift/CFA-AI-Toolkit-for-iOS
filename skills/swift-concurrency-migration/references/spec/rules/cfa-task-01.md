# CFA-SPEC-TASK-01: Define task ownership and overlapping-call policy

**Applies when:** Starting asynchronous operations.

**Strength:** Required.

**Guidance:** Each Feature defines whether equivalent calls share execution or commands queue, and owns work that must outlive a screen.

**Why:** Task lifetime and repeated actions remain predictable.

**Example:** Two equivalent reload callers await the same Feature-owned task. See the bundled Habit Tracker Pro HabitsFeature under 2 - AppModel/Features/Habits.

**Explanation:** [Unstructured tasks need an owner—not a ban](https://www.3daysofswiftconcurrency.com/cfa/explanation/unstructured-tasks) · [Two callers. One refresh. No lost edits.](https://www.3daysofswiftconcurrency.com/cfa/explanation/overlapping-requests).

**Verify:** Test overlapping callers, cancellation, failure, stale results and operation cleanup.

**Full rule, context and examples:** [Make Concurrency Behaviour Honest and Visible](../topics/20-make-concurrency-behaviour-honest-and-visible.md). This card is a reading aid; apply the complete canonical section.
