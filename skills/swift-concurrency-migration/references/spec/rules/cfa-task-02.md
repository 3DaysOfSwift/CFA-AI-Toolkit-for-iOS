# CFA-SPEC-TASK-02: Keep shared refreshes alive across navigation

**Applies when:** A screen leaves during a Feature-owned refresh.

**Strength:** Default.

**Guidance:** By default, the Feature-owned shared refresh continues after a screen leaves, even if that screen was the only caller. Retain successful data and let later equivalent callers join an in-flight request. Awaiting the shared Task handle does not end the wait on caller cancellation. If the screen needs a prompt exit, cancel its wait independently. Use another policy only for a specific product or resource requirement.

**Why:** The user may return and benefit from completed work.

**Example:** A schedule refresh continues after the user leaves the screen and its result is available on return.

**Explanation:** [Two callers. One refresh. No lost edits.](https://www.3daysofswiftconcurrency.com/cfa/explanation/overlapping-requests) · [Cancellation is a policy, not a button](https://www.3daysofswiftconcurrency.com/cfa/explanation/task-cancellation).

**Verify:** Cancel the only screen waiter and verify the refresh completes and retains its result without a replacement waiter. In a separate case, admit a later equivalent caller while the original refresh is suspended and verify it receives the same outcome without starting another request. Verify that when one of several waiters leaves, the others still receive the result. Where the screen requires prompt cancellation, verify its wait ends while the refresh is still in flight.

**Full rule, context and examples:** [Make Concurrency Behaviour Honest and Visible](../topics/20-make-concurrency-behaviour-honest-and-visible.md). This card is a reading aid; apply the complete canonical section.
