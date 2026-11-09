# CFA-SPEC-ERROR-01: Handle failures honestly

**Applies when:** Storage, network or business work fails.

**Strength:** Required.

**Guidance:** Report the outcome of the work the user requested. If a durable save fails, retain the draft and previously confirmed state and expose a recoverable error. If an optional cache write fails after a successful download, keep the fresh data visible and avoid claiming offline availability.

**Why:** The user needs to know whether an operation succeeded.

**Example:** An unsuccessful durable save leaves the editor available for retry.

**Explanation:** [Why use recoverable storage requests in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/storage-failures) · [Why use recoverable editing workflows in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/honest-errors-and-editing).

**Verify:** Inject failures and verify displayed outcomes and state.

**Full rule, context and examples:** [Keep Persistence Behind Repository Contracts](../topics/19-keep-persistence-behind-repository-contracts.md). This card is a reading aid; apply the complete canonical section.
