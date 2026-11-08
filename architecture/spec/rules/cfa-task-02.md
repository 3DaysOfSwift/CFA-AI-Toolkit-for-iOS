# CFA-SPEC-TASK-02: Keep shared refreshes alive across navigation

**Applies when:** A screen leaves during a Feature-owned refresh.

**Strength:** Default.

**Guidance:** Continue the shared refresh and retain successful data even when the screen that requested it leaves; later equivalent callers can join.

**Why:** The user may return and benefit from completed work.

**Example:** A schedule refresh continues after the user leaves the screen and its result is available on return.

**Explanation:** [Two callers. One refresh. No lost edits.](https://www.3daysofswiftconcurrency.com/cfa/explanation/overlapping-requests) · [Cancellation is a policy, not a button](https://www.3daysofswiftconcurrency.com/cfa/explanation/task-cancellation).

**Verify:** Cancel the screen waiter and verify the request and another caller remain correct.

**Full rule, context and examples:** [Make Concurrency Behaviour Honest and Visible](../topics/20-make-concurrency-behaviour-honest-and-visible.md). This card is a reading aid; apply the complete canonical section.
