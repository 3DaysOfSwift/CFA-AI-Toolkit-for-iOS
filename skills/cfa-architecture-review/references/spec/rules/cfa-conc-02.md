# CFA-SPEC-CONC-02: Check suspension and stale results

**Applies when:** Updating state across async suspension.

**Strength:** Required.

**Guidance:** Treat await as a possible suspension. Revalidate the assumptions that govern publication when execution resumes, including whether the operation is still current. Apply the same check to successful results and user-visible failures. Leave observable state consistent across suspension unless the intermediate state is intentional and representable.

**Why:** Actor isolation does not make an entire async workflow atomic.

**Example:** In the bundled Habit Tracker Pro starter, PurchasesFeature checks its entitlement revision so an older read cannot overwrite a newer result.

**Explanation:** [Why use actors and Sendable values in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/isolation-and-sendable).

**Verify:** Hold an older request, let its replacement publish, then release the older success or failure. Verify that neither current data nor the current error changes. Include a cancelled operation that still returns. Where the operation owns a replaceable task handle, also release the older request while the replacement is pending and verify its cleanup leaves the replacement and loading state intact.

**Full rule, context and examples:** [Make Concurrency Behaviour Honest and Visible](../topics/20-make-concurrency-behaviour-honest-and-visible.md). This card is a reading aid; apply the complete canonical section.
