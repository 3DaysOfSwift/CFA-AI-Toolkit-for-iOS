# CFA-SPEC-CONC-03: Use cancellation to match the work

**Applies when:** Designing task lifetime.

**Strength:** Required.

**Guidance:** Define cancellation at the operation boundary. Cancel superseded presentation work and screen-only work that has no value after departure. Preserve independent shared and durable work according to its ownership policy. Check cancellation before expensive work and again before publishing, and keep obsolete results from overwriting current state.

**Why:** Leaving one screen should not accidentally abandon work needed elsewhere.

**Example:** A superseded search stops while a shared refresh continues.

**Explanation:** [Cancellation is a policy, not a button](https://www.3daysofswiftconcurrency.com/cfa/explanation/task-cancellation).

**Verify:** Cancel a screen waiter while shared work remains active and verify that a later caller can still use the outcome. Complete an obsolete presentation request after its replacement and verify it cannot publish over the current result.

**Full rule, context and examples:** [Make Concurrency Behaviour Honest and Visible](../topics/20-make-concurrency-behaviour-honest-and-visible.md). This card is a reading aid; apply the complete canonical section.
