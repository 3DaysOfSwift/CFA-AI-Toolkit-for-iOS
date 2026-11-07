# CFA-SPEC-CONC-02: Check suspension and stale results

**Applies when:** Updating state across async suspension.

**Strength:** Required.

**Guidance:** Treat await as a possible suspension and check that the operation is still entitled to publish its result.

**Why:** Actor isolation does not make an entire async workflow atomic.

**Example:** An earlier search cannot overwrite a newer query result.

**Open-source code:** [Cuentiva](https://github.com/3DaysOfSwift/Cuentiva/blob/3bf3a9d4b7714182edd6d6778c843e234714db50/Cuentiva/2%20-%20AppModel/Features/Library/LibraryManager.swift). Inspect the specific behaviour; these projects may also contain older conventions.

**Explanation:** [Why use actors and Sendable values in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/isolation-and-sendable).

**Verify:** Force out-of-order results and cancellation in controlled tests.

**Full rule, context and examples:** [Make Concurrency Behaviour Honest and Visible](../topics/20-make-concurrency-behaviour-honest-and-visible.md). This card is a reading aid; apply the complete canonical section.
