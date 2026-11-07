# CFA-SPEC-CONC-03: Use cancellation to match the work

**Applies when:** Designing task lifetime.

**Strength:** Required.

**Guidance:** Define cancellation at the operation boundary; cancel obsolete presentation work while preserving independent shared and durable work.

**Why:** Leaving one screen should not accidentally abandon work needed elsewhere.

**Example:** A superseded search stops while a shared refresh continues.

**Explanation:** [Cancellation is a policy, not a button](https://www.3daysofswiftconcurrency.com/cfa/explanation/task-cancellation).

**Verify:** Test a cancelled waiter, a later caller and stale completion.

**Full rule, context and examples:** [Make Concurrency Behaviour Honest and Visible](../topics/20-make-concurrency-behaviour-honest-and-visible.md). This card is a reading aid; apply the complete canonical section.
