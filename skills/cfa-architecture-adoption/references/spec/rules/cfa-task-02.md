# CFA-SPEC-TASK-02: Keep shared refreshes alive across navigation

**Applies when:** A screen leaves during a Feature-owned refresh.

**Strength:** Default.

**Guidance:** By default, let a departing screen stop waiting while the Feature-owned shared refresh continues, even if that screen was the only caller. Retain successful data and let later equivalent callers join an in-flight request. Awaiting the shared Task handle does not end the wait on caller cancellation. If the screen needs a prompt exit, cancel its wait independently. Use another policy only for a specific product or resource requirement.

**Why:** The user may return and benefit from completed work.

**Example:** A schedule refresh continues after the user leaves the screen and its result is available on return.

**Explanation:** [Two callers. One refresh. No lost edits.](https://www.3daysofswiftconcurrency.com/cfa/explanation/overlapping-requests) · [Cancellation is a policy, not a button](https://www.3daysofswiftconcurrency.com/cfa/explanation/task-cancellation).

**Verify:** Cancel the only screen waiter and verify the refresh completes and retains its result; also verify another caller remains correct when one of several waiters leaves.

**Full rule, context and examples:** [Make Concurrency Behaviour Honest and Visible](../topics/20-make-concurrency-behaviour-honest-and-visible.md). This card is a reading aid; apply the complete canonical section.
