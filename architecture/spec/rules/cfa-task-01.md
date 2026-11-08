# CFA-SPEC-TASK-01: Define task ownership and overlapping-call policy

**Applies when:** Starting asynchronous operations.

**Strength:** Required.

**Guidance:** Each Feature defines whether equivalent calls share execution or commands queue, and owns work that must outlive a screen.

**Why:** Task lifetime and repeated actions remain predictable.

**Example:** Two equivalent refresh callers await the same Feature-owned request.

**Open-source code:** [Next Rocket Launch](https://github.com/3DaysOfSwift/RocketLaunch-iOS-App-Swift-Concurrency/blob/3ecaa30c76428bd8a6f5db8fd5506b6c20b846f7/Swift%20Concurrency%20Project/RocketLaunch/2%20-%20AppModel/Features/Launch%20Schedule/LaunchScheduleFeature.swift). Inspect the specific behaviour; these projects may also contain older conventions.

**Explanation:** [Unstructured tasks need an owner—not a ban](https://www.3daysofswiftconcurrency.com/cfa/explanation/unstructured-tasks) · [Two callers. One refresh. No lost edits.](https://www.3daysofswiftconcurrency.com/cfa/explanation/overlapping-requests).

**Verify:** Test overlapping callers, cancellation, failure, stale results and operation cleanup.

**Full rule, context and examples:** [Make Concurrency Behaviour Honest and Visible](../topics/20-make-concurrency-behaviour-honest-and-visible.md). This card is a reading aid; apply the complete canonical section.
