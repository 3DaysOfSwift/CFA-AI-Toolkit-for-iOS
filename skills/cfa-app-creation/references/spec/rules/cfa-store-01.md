# CFA-SPEC-STORE-01: Publish durable edits after saving

**Applies when:** Saving a user edit or other durable command.

**Strength:** Required.

**Guidance:** Publish confirmed saved state only after required authoritative persistence succeeds; preserve input on failure.

**Why:** The UI must not claim that an unsaved change was saved.

**Example:** A failed weight save leaves the saved collection unchanged and retains the entered value for retry.

**Open-source code:** [Trend](https://github.com/3DaysOfSwift/Trend-iOS-App-Swift-Concurrency-CFA/blob/2a747bc222535e9fda01ed722e9c2c103fb98905/Trend/2%20-%20AppModel/Features/WeightLog/WeightLogFeature.swift). Inspect the specific behaviour; these projects may also contain older conventions.

**Explanation:** [Why use record-level persistence boundaries in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/persistence-boundaries).

**Verify:** Inject failed and successful writes; check state and retry behaviour.

**Full rule, context and examples:** [Keep Persistence Behind Repository Contracts](../topics/19-keep-persistence-behind-repository-contracts.md). This card is a reading aid; apply the complete canonical section.
