# CFA-SPEC-CONC-02: Check suspension and stale results

**Applies when:** Updating state across async suspension.

**Strength:** Required.

**Guidance:** Treat await as a possible suspension and check that the operation is still entitled to publish its result.

**Why:** Actor isolation does not make an entire async workflow atomic.

**Example:** In the bundled Habit Tracker Pro starter, PurchasesFeature checks its entitlement revision so an older read cannot overwrite a newer result.

**Explanation:** [Why use actors and Sendable values in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/isolation-and-sendable).

**Verify:** Force out-of-order results and cancellation in controlled tests.

**Full rule, context and examples:** [Make Concurrency Behaviour Honest and Visible](../topics/20-make-concurrency-behaviour-honest-and-visible.md). This card is a reading aid; apply the complete canonical section.
