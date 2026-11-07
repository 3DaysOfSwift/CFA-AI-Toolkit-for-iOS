# CFA-SPEC-CACHE-01: Use optional snapshots without blocking fresh data

**Applies when:** Caching replaceable server data.

**Strength:** Required when using this cache pattern.

**Guidance:** Start restoration and refresh independently where both are needed; a successful current response does not wait for an optional cache write and must not be overwritten by an older snapshot.

**Why:** Previously downloaded data can appear quickly without sacrificing fresher server data.

**Example:** A schedule refresh publishes new server data even if its optional snapshot write is slow or fails.

**Open-source code:** [Next Rocket Launch](https://github.com/3DaysOfSwift/RocketLaunch-iOS-App-Swift-Concurrency/blob/3ecaa30c76428bd8a6f5db8fd5506b6c20b846f7/Swift%20Concurrency%20Project/RocketLaunch/2%20-%20AppModel/Features/Launch%20Schedule/LaunchScheduleFeature.swift). Inspect the specific behaviour; these projects may also contain older conventions.

**Explanation:** [Why use record-level persistence boundaries in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/persistence-boundaries).

**Verify:** Test missing, corrupt, slow and failed cache operations and out-of-order completion.

**Full rule, context and examples:** [Keep Persistence Behind Repository Contracts](../topics/19-keep-persistence-behind-repository-contracts.md). This card is a reading aid; apply the complete canonical section.
